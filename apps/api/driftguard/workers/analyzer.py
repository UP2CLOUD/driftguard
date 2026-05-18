import asyncio
import json
import time
from pathlib import Path

from driftguard.ai.findings import (
    Finding,
    from_checkov,
    from_infracost,
    from_plan_changes,
)
from driftguard.ai.formatter import format_comment
from driftguard.ai.reviewer import review as ai_review
from driftguard.core.db import SessionLocal
from driftguard.core.logging import log
from driftguard.core.workspace import workspace
from driftguard.integrations import checkov, infracost, terraform
from driftguard.integrations.git import download_tarball, find_terraform_dirs
from driftguard.integrations.github import installation_token, post_pr_comment


async def enqueue_pr_analysis(payload: dict) -> None:
    repo = payload["repository"]["full_name"]
    pr = payload["pull_request"]
    pr_number = pr["number"]
    head_sha = pr["head"]["sha"]
    installation_id = payload["installation"]["id"]

    log.info("analysis_queued", repo=repo, pr=pr_number, sha=head_sha)
    try:
        await analyze_pr(
            installation_id=installation_id,
            repo_full_name=repo,
            pr_number=pr_number,
            head_sha=head_sha,
        )
    except Exception as exc:
        log.exception("analysis_failed", repo=repo, pr=pr_number, error=str(exc))


async def _load_repo_settings(repo_full_name: str) -> dict:
    """Load repo AWS settings from DB. Returns empty dict if not configured."""
    try:
        from sqlalchemy import select

        from driftguard.db.models import Repository

        async with SessionLocal() as session:
            result = await session.execute(select(Repository).where(Repository.full_name == repo_full_name))
            repo = result.scalar_one_or_none()
            if repo and repo.settings:
                return repo.settings
    except Exception as exc:
        log.warning("repo_settings_load_failed", repo=repo_full_name, error=str(exc))
    return {}


async def _get_aws_env(settings: dict) -> dict[str, str] | None:
    """Resolve AWS credentials from repo settings via STS AssumeRole."""
    role_arn = settings.get("aws_role_arn")
    if not role_arn:
        return None

    region = settings.get("aws_region", "eu-west-1")
    try:
        from driftguard.integrations.aws import assume_role

        creds = await asyncio.to_thread(assume_role, role_arn, region)
        log.info("aws_assume_role_ok", role_arn=role_arn, region=region)
        return creds.as_env()
    except PermissionError as exc:
        log.warning("aws_assume_role_failed", role_arn=role_arn, error=str(exc))
        return None


async def _fetch_real_state(settings: dict, aws_env: dict[str, str]) -> dict[str, set[str]] | None:
    """Fetch terraform state from S3 and extract resources."""
    bucket = settings.get("state_bucket")
    key = settings.get("state_key")
    if not bucket or not key:
        return None

    region = settings.get("aws_region", "eu-west-1")
    try:
        import boto3

        s3 = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=aws_env["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=aws_env["AWS_SECRET_ACCESS_KEY"],
            aws_session_token=aws_env.get("AWS_SESSION_TOKEN"),
        )
        resp = s3.get_object(Bucket=bucket, Key=key)
        state = json.loads(resp["Body"].read())
        resources = set()
        for r in state.get("resources", []):
            rtype = r.get("type", "")
            name = r.get("name", "")
            if rtype and name:
                resources.add(f"{rtype}.{name}")
        log.info("s3_state_fetched", bucket=bucket, key=key, resources=len(resources))
        return resources
    except Exception as exc:
        log.warning("s3_state_fetch_failed", bucket=bucket, key=key, error=str(exc))
        return None


async def analyze_pr(*, installation_id: int, repo_full_name: str, pr_number: int, head_sha: str) -> dict:
    started = time.monotonic()
    pr_ctx = {"repo": repo_full_name, "pr_number": pr_number, "head_sha": head_sha}

    token = await installation_token(installation_id)

    # Load repo AWS config
    repo_settings = await _load_repo_settings(repo_full_name)
    aws_env = await _get_aws_env(repo_settings)

    # S3 backend config for terraform init (if configured)
    backend_config: dict | None = None
    if aws_env and repo_settings.get("state_bucket"):
        backend_config = {
            "bucket": repo_settings["state_bucket"],
            "key": repo_settings.get("state_key", "terraform.tfstate"),
            "region": repo_settings.get("aws_region", "eu-west-1"),
        }

    async with workspace() as ws:
        root = await download_tarball(token, repo_full_name, head_sha, ws)
        tf_dirs = find_terraform_dirs(root)

        if not tf_dirs:
            log.info("no_terraform", repo=repo_full_name, pr=pr_number)
            return {"status": "skipped", "reason": "no terraform files"}

        # Fetch real state from S3 for drift detection
        real_state: set[str] | None = None
        if aws_env:
            real_state = await asyncio.to_thread(
                lambda: (
                    asyncio.get_event_loop().run_until_complete(_fetch_real_state(repo_settings, aws_env))
                    if False
                    else None
                )
            )
            real_state = await _fetch_real_state(repo_settings, aws_env)

        findings = await _analyze_all_dirs(
            tf_dirs,
            aws_env=aws_env,
            backend_config=backend_config,
            real_state=real_state,
        )

    review_md = await ai_review(findings, pr_ctx)

    duration_ms = int((time.monotonic() - started) * 1000)
    body = format_comment(
        findings=findings,
        review_md=review_md,
        meta={
            "repo": repo_full_name,
            "pr_number": pr_number,
            "head_sha": head_sha,
            "duration_ms": duration_ms,
            "has_real_aws": bool(aws_env),
        },
    )

    await post_pr_comment(token, repo_full_name, pr_number, body)
    log.info(
        "analysis_complete",
        repo=repo_full_name,
        pr=pr_number,
        findings=len(findings),
        duration_ms=duration_ms,
        real_aws=bool(aws_env),
    )
    return {"status": "ok", "findings": len(findings), "duration_ms": duration_ms}


_semaphore = asyncio.Semaphore(3)


async def _analyze_all_dirs(
    tf_dirs: list[Path],
    aws_env: dict[str, str] | None = None,
    backend_config: dict | None = None,
    real_state: set[str] | None = None,
) -> list[Finding]:
    async def _bounded(d: Path) -> list[Finding]:
        async with _semaphore:
            return await _analyze_dir(d, aws_env=aws_env, backend_config=backend_config, real_state=real_state)

    results = await asyncio.gather(*[_bounded(d) for d in tf_dirs], return_exceptions=True)
    findings: list[Finding] = []
    for r in results:
        if isinstance(r, Exception):
            log.warning("dir_analysis_error", error=str(r))
        else:
            findings.extend(r)
    return findings


async def _analyze_dir(
    tf_dir: Path,
    aws_env: dict[str, str] | None = None,
    backend_config: dict | None = None,
    real_state: set[str] | None = None,
) -> list[Finding]:
    plan_json = await terraform.analyze_directory(
        tf_dir,
        aws_env=aws_env,
        backend_config=backend_config,
    )
    if plan_json is None:
        return []

    plan_json_path = tf_dir / "plan.json"
    plan_json_path.write_text(json.dumps(plan_json))

    findings: list[Finding] = []
    findings.extend(from_plan_changes(plan_json))

    cost_task = asyncio.to_thread(_safe_infracost, plan_json_path)
    sec_task = asyncio.to_thread(_safe_checkov, plan_json_path)
    drift_task = asyncio.to_thread(_safe_drift, tf_dir, plan_json, real_state)
    cost_diff, sec_results, drift_findings = await asyncio.gather(cost_task, sec_task, drift_task)

    if cost_diff:
        findings.extend(from_infracost(cost_diff))
    if sec_results:
        findings.extend(from_checkov(sec_results))
    if drift_findings:
        findings.extend(drift_findings)

    return findings


def _safe_drift(
    tf_dir: Path,
    plan_json: dict,
    real_state: set[str] | None = None,
) -> list[Finding]:
    try:
        from driftguard.integrations.drift import DriftAnalyzer

        # Prefer real S3 state, fall back to local tfstate file
        if real_state is not None:
            state_resources = real_state
        else:
            state_file = tf_dir / "terraform.tfstate"
            state_resources = DriftAnalyzer.analyze_state_file(state_file)

        if not state_resources:
            return []

        planned_resources = set(DriftAnalyzer.from_plan_json(plan_json))
        drift_results = DriftAnalyzer.detect_drift(
            planned_resources=planned_resources,
            state_resources=state_resources,
        )
        return [
            Finding(
                type=d["type"],
                severity=d["severity"],
                resource=d["resource"],
                message=d["message"],
                suggestion=d.get("suggestion"),
                controls=tuple(d.get("controls", [])),
            )
            for d in drift_results
        ]
    except Exception as exc:
        log.warning("drift_detection_failed", error=str(exc))
        return []


def _safe_infracost(path: Path) -> dict | None:
    try:
        return infracost.cost_breakdown(str(path))
    except Exception as exc:
        log.warning("infracost_failed", error=str(exc))
        return None


def _safe_checkov(path: Path) -> list[dict] | None:
    try:
        return checkov.scan(str(path))
    except Exception as exc:
        log.warning("checkov_failed", error=str(exc))
        return None
