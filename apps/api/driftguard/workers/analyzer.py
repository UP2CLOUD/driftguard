"""PR analyzer — core pipeline.

Flow:
  download tarball → static scan (K8s/GHA/TF rules, no binary needed)
  + plan-based analysis (TF dirs only) → merge findings → AI review
  → post PR comment + Check Run → persist Analysis+Findings
  → upload plan to R2 → return {analysis_id, status, findings, ...}
"""

import asyncio
import json
import time
import uuid
from pathlib import Path

from driftguard.ai.findings import (
    Finding,
    from_checkov,
    from_infracost,
    from_plan_changes,
    from_static_scan,
)
from driftguard.ai.formatter import format_comment
from driftguard.ai.reviewer import review as ai_review
from driftguard.core.db import SessionLocal
from driftguard.core.logging import log
from driftguard.core.workspace import workspace
from driftguard.events.publisher import publish as publish_event  # noqa: F401
from driftguard.events.schemas import Severity  # noqa: F401
from driftguard.integrations import checkov, infracost, terraform
from driftguard.integrations.git import download_tarball, find_terraform_dirs
from driftguard.integrations.github import installation_token, post_check_run, post_pr_comment
from driftguard.services.scanner.engine import scan_directory_sync
from driftguard.services.terraform.plan_parser import TerraformPlan, parse_plan
from driftguard.services.terraform.risk_scorer import RiskResult
from driftguard.services.terraform.risk_scorer import score as score_plan


async def enqueue_pr_analysis(payload: dict) -> None:
    repo = payload["repository"]["full_name"]
    pr = payload["pull_request"]
    pr_number = pr["number"]
    head_sha = pr["head"]["sha"]
    installation_id = payload["installation"]["id"]

    log.info("analysis_queued", repo=repo, pr=pr_number, sha=head_sha)
    try:
        from driftguard.worker.app import celery_app

        celery_app.send_task(
            "driftguard.worker.tasks.run_analysis",
            kwargs={
                "installation_id": installation_id,
                "repo_full_name": repo,
                "pr_number": pr_number,
                "head_sha": head_sha,
            },
            queue="analysis",
        )
    except Exception:
        # Celery not available (dev) — run inline
        log.warning("celery_unavailable_running_inline", repo=repo)
        await analyze_pr(
            installation_id=installation_id,
            repo_full_name=repo,
            pr_number=pr_number,
            head_sha=head_sha,
        )


async def _load_repo_settings(repo_full_name: str) -> dict:
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
    role_arn = settings.get("aws_role_arn")
    if not role_arn:
        return None
    try:
        from driftguard.integrations.aws import assume_role

        creds = await asyncio.to_thread(assume_role, role_arn, settings.get("aws_external_id"))
        return {
            "AWS_ACCESS_KEY_ID": creds["AccessKeyId"],
            "AWS_SECRET_ACCESS_KEY": creds["SecretAccessKey"],
            "AWS_SESSION_TOKEN": creds["SessionToken"],
        }
    except Exception as exc:
        log.warning("sts_assume_role_failed", role_arn=role_arn, error=str(exc))
        return None


async def _fetch_real_state(settings: dict, aws_env: dict) -> set[str] | None:
    bucket = settings.get("state_bucket")
    key = settings.get("state_key", "terraform.tfstate")
    if not bucket:
        return None
    try:
        import boto3

        region = settings.get("aws_region", "eu-west-1")
        session = boto3.Session(
            aws_access_key_id=aws_env["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=aws_env["AWS_SECRET_ACCESS_KEY"],
            aws_session_token=aws_env.get("AWS_SESSION_TOKEN"),
            region_name=region,
        )
        s3 = session.client("s3")
        obj = await asyncio.to_thread(s3.get_object, Bucket=bucket, Key=key)
        state = json.loads(obj["Body"].read())
        resources = set()
        for r in state.get("resources", []):
            for inst in r.get("instances", []):
                addr = inst.get("attributes", {}).get("id") or r.get("name", "")
                if addr:
                    resources.add(addr)
        return resources
    except Exception as exc:
        log.warning("fetch_real_state_failed", error=str(exc))
        return None


async def _persist_analysis(
    *,
    installation_id: int,
    repo_full_name: str,
    pr_number: int,
    head_sha: str,
    findings: list[Finding],
    review_md: str,
    risk_score: int,
    duration_ms: int,
) -> str:
    """Persist analysis + findings in DB. Returns analysis_id."""
    try:
        from sqlalchemy import select

        from driftguard.db.models import (
            Analysis,
            PullRequest,
            Repository,
        )
        from driftguard.db.models import (
            Finding as FindingModel,
        )

        analysis_id = str(uuid.uuid4())
        async with SessionLocal() as session:
            # Resolve repo
            repo_row = (
                await session.execute(select(Repository).where(Repository.full_name == repo_full_name))
            ).scalar_one_or_none()
            if not repo_row:
                return analysis_id

            # Upsert PR
            pr_row = (
                await session.execute(
                    select(PullRequest).where(
                        PullRequest.repo_id == repo_row.id,
                        PullRequest.github_pr_number == pr_number,
                    )
                )
            ).scalar_one_or_none()
            if not pr_row:
                pr_row = PullRequest(
                    id=str(uuid.uuid4()),
                    repo_id=repo_row.id,
                    github_pr_number=pr_number,
                    head_sha=head_sha,
                )
                session.add(pr_row)
                await session.flush()

            analysis = Analysis(
                id=analysis_id,
                pr_id=pr_row.id,
                status="completed",
                risk_score=risk_score,
                cost_delta_cents=None,
                summary_md=review_md,
            )
            session.add(analysis)

            for f in findings:
                session.add(
                    FindingModel(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis_id,
                        type=f.type,
                        severity=f.severity,
                        resource=f.resource,
                        message=f.message,
                        suggestion=f.suggestion,
                    )
                )

            await session.commit()
        log.info("analysis_persisted", analysis_id=analysis_id)
        return analysis_id
    except Exception as exc:
        log.error("analysis_persist_failed", error=str(exc))
        return str(uuid.uuid4())


def _compute_risk(findings: list[Finding], plan: "TerraformPlan | None" = None) -> int:
    """
    Compute risk score.
    When a parsed TerraformPlan is available, uses the deterministic plan-level scorer.
    Falls back to finding-severity weighted sum for backward compatibility.
    """
    if plan is not None and plan.changes:
        result: RiskResult = score_plan(plan.changes, block_threshold=70)
        return result.score
    # Fallback: finding-severity sum (no plan available)
    if not findings:
        return 0
    weights = {"critical": 40, "high": 20, "medium": 8, "low": 2}
    return min(100, sum(weights.get(f.severity, 0) for f in findings))


async def _run_static_scan(root: Path) -> list[Finding]:
    """Run the static IaC scanner on the repo root. No external tools required.

    Scans all .tf, K8s YAML, and .github/workflows files in the repo tree.
    Converts ScanFinding objects to Finding objects with compliance controls.
    """
    try:
        result = await asyncio.to_thread(scan_directory_sync, root)
        converted = from_static_scan(result.findings)
        log.info(
            "static_scan_complete",
            tf=result.tf_files,
            k8s=result.k8s_files,
            gha=result.gha_files,
            findings=len(converted),
        )
        return converted
    except Exception as exc:
        log.warning("static_scan_failed", error=str(exc))
        return []


def _merge_findings(static: list[Finding], plan: list[Finding]) -> list[Finding]:
    """Merge static + plan-based findings without duplicating TF coverage.

    When plan-based analysis ran (Checkov + plan.json), it covers TF files
    more accurately with actual plan context. We keep plan findings and only
    append static findings for K8s (K8S*) and GHA (GHA*) rule IDs.
    When no plan findings exist (no TF dirs or plan failed), return all static.
    """
    if not plan:
        return static
    k8s_gha = [f for f in static if f.rule_id and not f.rule_id.startswith("TF")]
    return plan + k8s_gha


async def analyze_pr(*, installation_id: int, repo_full_name: str, pr_number: int, head_sha: str) -> dict:
    started = time.monotonic()
    pr_ctx = {"repo": repo_full_name, "pr_number": pr_number, "head_sha": head_sha}

    token = await installation_token(installation_id)
    repo_settings = await _load_repo_settings(repo_full_name)
    aws_env = await _get_aws_env(repo_settings)

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

        real_state: set[str] | None = None
        if aws_env:
            real_state = await _fetch_real_state(repo_settings, aws_env)

        # Static scan runs on every PR — catches K8s, GHA, and TF rule violations
        # without requiring a Terraform binary or AWS credentials.
        static_findings = await _run_static_scan(root)

        if not tf_dirs and not static_findings:
            log.info("no_iac_files", repo=repo_full_name, pr=pr_number)
            return {"status": "skipped", "reason": "no IaC files found"}

        # Plan-based analysis: only when TF files exist and terraform binary available
        plan_findings: list[Finding] = []
        plan_bytes: bytes | None = None
        if tf_dirs:
            plan_findings, plan_bytes = await _analyze_all_dirs(
                tf_dirs,
                aws_env=aws_env,
                backend_config=backend_config,
                real_state=real_state,
            )

    # Plan-based TF findings (Checkov + plan context) take precedence over
    # static TF findings; K8s and GHA findings from static scan are always kept.
    findings = _merge_findings(static_findings, plan_findings)

    risk_score = _compute_risk(findings)
    review_md = await ai_review(findings, pr_ctx)
    duration_ms = int((time.monotonic() - started) * 1000)

    body = format_comment(
        findings=findings,
        ai_review_md=review_md,
        summary_meta={
            "sha": head_sha,
            "duration_ms": duration_ms,
            "has_real_aws": bool(aws_env),
            "risk_score": risk_score,
        },
    )

    await post_pr_comment(token, repo_full_name, pr_number, body)

    # GitHub Check Run — gates merge button when branch protection requires it
    if risk_score >= 70:
        conclusion = "failure"
        title = f"Blocked — risk {risk_score}/100"
    elif risk_score >= 40:
        conclusion = "neutral"
        title = f"Warnings — risk {risk_score}/100"
    else:
        conclusion = "success"
        title = f"Approved — risk {risk_score}/100"

    try:
        await post_check_run(
            token,
            repo_full_name,
            head_sha,
            conclusion=conclusion,
            title=title,
            summary=f"{len(findings)} findings across cost, drift, security. See PR comment for details.",
        )
    except Exception as exc:  # noqa: BLE001 — check run is non-critical
        log.warning("check_run_post_failed", error=str(exc))

    # Persist to DB
    analysis_id = await _persist_analysis(
        installation_id=installation_id,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        head_sha=head_sha,
        findings=findings,
        review_md=review_md,
        risk_score=risk_score,
        duration_ms=duration_ms,
    )

    # Audit log — DORA/NIS2 evidence
    try:
        from driftguard.core.db import SessionLocal
        from driftguard.services.audit import record as _audit

        async with SessionLocal() as _db:
            await _audit(
                _db,
                org_id=repo_full_name.split("/")[0],
                action="analysis.completed" if risk_score < 70 else "policy.blocked",
                actor="driftguard-bot",
                target=f"{repo_full_name}#PR-{pr_number}",
                payload={
                    "analysis_id": analysis_id,
                    "risk_score": risk_score,
                    "findings": len(findings),
                    "head_sha": head_sha,
                },
            )
            await _db.commit()
    except Exception as _exc:  # noqa: BLE001
        log.warning("audit_write_failed", error=str(_exc))

    # Upload plan tarball to R2 (non-blocking)
    if plan_bytes:
        try:
            from driftguard.services.storage import plan_key, upload_plan

            org_id = repo_full_name.split("/")[0]
            key = plan_key(org_id, repo_full_name, pr_number, head_sha)
            upload_plan(key, plan_bytes, content_type="application/gzip")
        except Exception as exc:
            log.warning("plan_upload_failed", error=str(exc))

    # Analytics
    try:
        from driftguard.services.analytics import track

        track(
            "pr_analyzed",
            {
                "repo": repo_full_name,
                "pr": pr_number,
                "findings": len(findings),
                "risk_score": risk_score,
                "duration_ms": duration_ms,
                "has_aws": bool(aws_env),
            },
        )
    except Exception as _exc:
        log.debug("analytics_track_failed", error=str(_exc))

    log.info(
        "analysis_complete",
        repo=repo_full_name,
        pr=pr_number,
        findings=len(findings),
        duration_ms=duration_ms,
        risk_score=risk_score,
        analysis_id=analysis_id,
    )
    return {
        "status": "ok",
        "analysis_id": analysis_id,
        "findings": len(findings),
        "risk_score": risk_score,
        "duration_ms": duration_ms,
    }


# ── Directory-level analysis ──────────────────────────────────────────────────

_semaphore = asyncio.Semaphore(3)


async def _analyze_all_dirs(
    tf_dirs: list[Path],
    aws_env: dict[str, str] | None = None,
    backend_config: dict | None = None,
    real_state: set[str] | None = None,
) -> tuple[list[Finding], bytes | None]:
    async def _bounded(d: Path) -> tuple[list[Finding], bytes | None]:
        async with _semaphore:
            return await _analyze_dir(d, aws_env=aws_env, backend_config=backend_config, real_state=real_state)

    results = await asyncio.gather(*[_bounded(d) for d in tf_dirs], return_exceptions=True)
    findings: list[Finding] = []
    plan_bytes: bytes | None = None
    for r in results:
        if isinstance(r, Exception):
            log.warning("dir_analysis_error", error=str(r))
        else:
            f, pb = r
            findings.extend(f)
            if pb and plan_bytes is None:
                plan_bytes = pb
    return findings, plan_bytes


async def _analyze_dir(
    tf_dir: Path,
    aws_env: dict[str, str] | None = None,
    backend_config: dict | None = None,
    real_state: set[str] | None = None,
) -> tuple[list[Finding], bytes | None]:
    plan_json = await terraform.analyze_directory(
        tf_dir,
        aws_env=aws_env,
        backend_config=backend_config,
    )
    if plan_json is None:
        return [], None

    plan_json_path = tf_dir / "plan.json"
    plan_json_path.write_text(json.dumps(plan_json))
    plan_bytes = plan_json_path.read_bytes()

    # Parse plan with typed parser — structured ResourceChange objects
    _parsed_plan: TerraformPlan | None = None
    try:
        _parsed_plan = parse_plan(plan_json)
    except Exception as _parse_err:
        log.warning("plan.parse.failed", extra={"error": str(_parse_err)})

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

    return findings, plan_bytes


def _safe_drift(tf_dir: Path, plan_json: dict, real_state: set[str] | None = None) -> list[Finding]:
    try:
        from driftguard.integrations.drift import DriftAnalyzer

        state_resources = (
            real_state if real_state is not None else DriftAnalyzer.analyze_state_file(tf_dir / "terraform.tfstate")
        )
        if not state_resources:
            return []
        planned = set(DriftAnalyzer.from_plan_json(plan_json))
        return [
            Finding(
                type=d["type"],
                severity=d["severity"],
                resource=d["resource"],
                message=d["message"],
                suggestion=d.get("suggestion"),
                controls=tuple(d.get("controls", [])),
            )
            for d in DriftAnalyzer.detect_drift(planned_resources=planned, state_resources=state_resources)
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
