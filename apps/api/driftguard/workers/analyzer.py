import asyncio
import time
from pathlib import Path

from driftguard.ai.findings import (
    Finding,
    aggregate_cost_cents,
    from_checkov,
    from_infracost,
    from_plan_changes,
    risk_score,
)
from driftguard.ai.formatter import format_comment
from driftguard.ai.reviewer import review as ai_review
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


async def analyze_pr(*, installation_id: int, repo_full_name: str, pr_number: int, head_sha: str) -> dict:
    started = time.monotonic()
    pr_ctx = {"repo": repo_full_name, "pr_number": pr_number, "head_sha": head_sha}

    token = await installation_token(installation_id)

    async with workspace() as ws:
        root = await download_tarball(token, repo_full_name, head_sha, ws)
        tf_dirs = find_terraform_dirs(root)

        if not tf_dirs:
            log.info("no_terraform", repo=repo_full_name, pr=pr_number)
            return {"status": "skipped", "reason": "no terraform files"}

        findings = await _analyze_all_dirs(tf_dirs)

    review_md = await ai_review(findings, pr_ctx)

    duration_ms = int((time.monotonic() - started) * 1000)
    body = format_comment(
        findings=findings,
        ai_review_md=review_md,
        summary_meta={"duration_ms": duration_ms, "sha": head_sha},
    )

    await post_pr_comment(token, repo_full_name, pr_number, body)

    log.info(
        "analysis_done",
        repo=repo_full_name,
        pr=pr_number,
        findings=len(findings),
        cost_cents=aggregate_cost_cents(findings),
        risk=risk_score(findings),
        duration_ms=duration_ms,
    )
    return {
        "status": "ok",
        "findings": len(findings),
        "cost_cents": aggregate_cost_cents(findings),
        "risk": risk_score(findings),
    }


async def _analyze_all_dirs(tf_dirs: list[Path]) -> list[Finding]:
    semaphore = asyncio.Semaphore(3)

    async def run_one(d: Path) -> list[Finding]:
        async with semaphore:
            return await _analyze_dir(d)

    results = await asyncio.gather(*(run_one(d) for d in tf_dirs), return_exceptions=True)
    findings: list[Finding] = []
    for r in results:
        if isinstance(r, Exception):
            log.warning("dir_analysis_error", error=str(r))
            continue
        findings.extend(r)
    return findings


async def _analyze_dir(tf_dir: Path) -> list[Finding]:
    plan_json = await terraform.analyze_directory(tf_dir)
    if plan_json is None:
        return []

    plan_json_path = tf_dir / "plan.json"
    import json as _json

    plan_json_path.write_text(_json.dumps(plan_json))

    findings: list[Finding] = []
    findings.extend(from_plan_changes(plan_json))

    cost_task = asyncio.to_thread(_safe_infracost, plan_json_path)
    sec_task = asyncio.to_thread(_safe_checkov, plan_json_path)
    drift_task = asyncio.to_thread(_safe_drift, tf_dir, plan_json)
    cost_diff, sec_results, drift_findings = await asyncio.gather(cost_task, sec_task, drift_task)

    if cost_diff:
        findings.extend(from_infracost(cost_diff))
    if sec_results:
        findings.extend(from_checkov(sec_results))
    if drift_findings:
        findings.extend(drift_findings)

    return findings


def _safe_drift(tf_dir: Path, plan_json: dict) -> list[Finding] | None:
    try:
        from driftguard.integrations.drift import DriftAnalyzer

        state_file = tf_dir / "terraform.tfstate"
        state_resources = DriftAnalyzer.analyze_state_file(state_file)
        if state_resources is None:
            return []

        planned_resources = set(DriftAnalyzer.from_plan_json(plan_json))
        drift_results = DriftAnalyzer.detect_drift(planned_resources=planned_resources, state_resources=state_resources)
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
