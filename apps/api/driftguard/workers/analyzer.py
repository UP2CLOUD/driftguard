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
from datetime import UTC, datetime
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
from driftguard.core.config import settings
from driftguard.core.db import SessionLocal
from driftguard.core.logging import log
from driftguard.core.workspace import workspace
from driftguard.events.publisher import publish as publish_event  # noqa: F401
from driftguard.events.schemas import Severity  # noqa: F401
from driftguard.integrations import checkov, infracost, terraform
from driftguard.integrations.git import download_tarball, find_terraform_dirs
from driftguard.integrations.github import installation_token, post_check_run, post_pr_comment, submit_pr_review
from driftguard.services.memory_recall import format_recall_section, recall_similar, store_memory
from driftguard.services.policy_engine import apply_policies
from driftguard.services.scanner.engine import scan_directory_sync
from driftguard.services.terraform.plan_parser import TerraformPlan, parse_plan
from driftguard.services.terraform.risk_scorer import RiskResult
from driftguard.services.terraform.risk_scorer import score as score_plan


async def enqueue_pr_merged(payload: dict) -> None:
    """On PR merge: update memory outcome to 'merged' (arch step 05)."""
    repo = payload["repository"]["full_name"]
    pr_number = payload["pull_request"]["number"]
    installation_id = payload["installation"]["id"]

    try:
        from sqlalchemy import select

        from driftguard.db.models import IncidentEmbedding, Organization

        async with SessionLocal() as db:
            org = (
                (
                    await db.execute(
                        select(Organization)
                        .where(Organization.github_installation_id == installation_id)
                        .order_by(Organization.created_at.desc())
                    )
                )
                .scalars()
                .first()
            )
            if not org:
                return
            rows = (
                (
                    await db.execute(
                        select(IncidentEmbedding).where(
                            IncidentEmbedding.org_id == org.id,
                            IncidentEmbedding.repo_full_name == repo,
                            IncidentEmbedding.pr_number == pr_number,
                        )
                    )
                )
                .scalars()
                .all()
            )
            for row in rows:
                row.outcome = "merged"
            await db.commit()
            log.info("memory.outcome_updated", repo=repo, pr=pr_number, rows=len(rows))
    except Exception as exc:
        log.warning("memory_merge_update_failed", repo=repo, pr=pr_number, error=str(exc))


async def enqueue_pr_analysis(payload: dict) -> None:
    repo = payload["repository"]["full_name"]
    pr = payload["pull_request"]
    pr_number = pr["number"]
    head_sha = pr["head"]["sha"]
    installation_id = payload["installation"]["id"]

    log.info("analysis_queued", repo=repo, pr=pr_number, sha=head_sha)

    # ── Quota & idempotency gate ────────────────────────────────────────────────
    try:
        from sqlalchemy import select

        from driftguard.db.models import Organization, Repository
        from driftguard.services.quota import is_premium, try_consume_pr_quota, try_record_scan_run

        async with SessionLocal() as db:
            org = (
                (
                    await db.execute(
                        select(Organization)
                        .where(Organization.github_installation_id == installation_id)
                        .order_by(Organization.created_at.desc())
                    )
                )
                .scalars()
                .first()
            )

            if org is None:
                log.warning("analysis_no_org", installation_id=installation_id, repo=repo)
                return

            repo_row = (await db.execute(select(Repository).where(Repository.full_name == repo))).scalar_one_or_none()

            if repo_row is not None and not repo_row.enabled:
                log.info("analysis_repo_disabled", repo=repo, org_id=org.id)
                return

            repo_id = repo_row.id if repo_row else "unknown"

            # Idempotency: skip identical (org, repo, pr, sha) already processed.
            is_new = await try_record_scan_run(db, org.id, repo_id, pr_number, head_sha)
            if not is_new:
                log.info("analysis_duplicate_skipped", repo=repo, pr=pr_number, sha=head_sha[:8])
                return

            # Monthly PR quota (premium orgs only).
            if is_premium(org) and not await try_consume_pr_quota(db, org):
                log.info("analysis_quota_exceeded", org_id=org.id, repo=repo, pr=pr_number)
                await db.commit()
                try:
                    token = await installation_token(installation_id)
                    await post_pr_comment(
                        token,
                        repo,
                        pr_number,
                        "**DriftGuard:** Monthly PR review limit reached. "
                        f"Visit {settings.public_base_url}/dashboard to manage your plan.",
                    )
                except Exception as _quota_comment_exc:  # noqa: BLE001
                    log.warning("quota_comment_failed", repo=repo, error=str(_quota_comment_exc))
                return

            await db.commit()
    except Exception as exc:
        log.warning("quota_gate_failed", repo=repo, pr=pr_number, error=str(exc))
        # Fail open — don't block analysis on quota check errors.

    if settings.celery_enabled:
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
            return
        except Exception:
            log.warning("celery_unavailable_running_inline", repo=repo)

    # No worker deployed — run inline in background task
    try:
        await analyze_pr(
            installation_id=installation_id,
            repo_full_name=repo,
            pr_number=pr_number,
            head_sha=head_sha,
        )
    except Exception as exc:
        import traceback

        log.error("analyze_pr_failed", repo=repo, pr=pr_number, error=str(exc), exc_info=True)
        # Post error comment so it's visible without Render logs
        try:
            token = await installation_token(installation_id)
            await post_pr_comment(
                token, repo, pr_number, f"⚠️ **DriftGuard analysis failed**\n```\n{traceback.format_exc()[-1500:]}\n```"
            )
        except Exception:  # noqa: S110
            pass


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
                    base_sha="0" * 40,
                    status="open",
                )
                session.add(pr_row)
                await session.flush()

            now_dt = datetime.now(UTC)
            analysis = Analysis(
                id=analysis_id,
                pr_id=pr_row.id,
                status="completed",
                risk_score=risk_score,
                cost_delta_cents=None,
                summary_md=review_md,
                started_at=now_dt,
                finished_at=now_dt,
            )
            session.add(analysis)

            for f in findings:
                session.add(
                    FindingModel(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis_id,
                        type=f.type,
                        severity=f.severity,
                        resource_address=f.resource,
                        message=f.message,
                        suggestion=f.suggestion,
                        rule_id=f.rule_id,
                        file=f.file,
                        line=f.line,
                        controls=list(f.controls) if f.controls else None,
                        category=getattr(f, "category", None),
                        title=getattr(f, "title", None),
                    )
                )

            await session.commit()
        log.info("analysis_persisted", analysis_id=analysis_id, repo=repo_full_name)
        return analysis_id
    except Exception as exc:
        import traceback

        log.error(
            "analysis_persist_failed",
            error=str(exc),
            traceback=traceback.format_exc()[-500:],
            repo=repo_full_name,
            pr=pr_number,
        )
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


async def _run_static_scan(root: Path) -> tuple[list[Finding], int, int, int, int, str | None]:
    """Run the static IaC scanner on the repo root. No external tools required.

    Scans all .tf, K8s YAML, and .github/workflows files in the repo tree.
    Converts ScanFinding objects to Finding objects with compliance controls.
    Returns (findings, files_scanned, tf_files, k8s_files, gha_files, error_message).
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
        return converted, result.files_scanned, result.tf_files, result.k8s_files, result.gha_files, None
    except Exception as exc:
        log.warning("static_scan_failed", error=str(exc))
        return [], 0, 0, 0, 0, f"Static scanner failed: {exc}"


def _merge_findings(static: list[Finding], plan: list[Finding]) -> list[Finding]:
    """Merge static + plan-based findings without duplicating TF coverage.

    Plan-based analysis (Checkov + plan.json) covers TF resources more
    accurately than static regex rules. For any TF resource already covered
    by a plan finding, we prefer the plan finding. For resources NOT seen in
    the plan (e.g. dirs that failed to plan), we keep the static TF findings.
    K8s (K8S*) and GHA (GHA*) static findings are always kept.
    """
    if not plan:
        return static
    # Resources already analysed by the plan runner — skip static TF dupes for these.
    plan_resources = {f.resource for f in plan}
    non_tf = [f for f in static if f.rule_id and not f.rule_id.startswith("TF")]
    # Keep static TF findings for resources the plan didn't cover (partial failure).
    uncovered_tf = [
        f for f in static if (not f.rule_id or f.rule_id.startswith("TF")) and f.resource not in plan_resources
    ]
    return plan + non_tf + uncovered_tf


async def analyze_pr(*, installation_id: int, repo_full_name: str, pr_number: int, head_sha: str) -> dict:
    started = time.monotonic()
    pr_ctx = {"repo": repo_full_name, "pr_number": pr_number, "head_sha": head_sha}
    scan_errors: list[str] = []

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
        static_findings, files_scanned, tf_files, k8s_files, gha_files, _scan_err = await _run_static_scan(root)
        if _scan_err:
            scan_errors.append(_scan_err)

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

    # Policy enforcement (arch step 03) — apply org rules, add policy findings
    policy_findings: list[Finding] = []
    policy_verdict = "pass"
    try:
        async with SessionLocal() as _pol_db:
            policy_findings, policy_verdict = await apply_policies(_pol_db, installation_id, findings)
            await _pol_db.commit()
        if policy_findings:
            findings = findings + policy_findings
            log.info("policy_applied", count=len(policy_findings), verdict=policy_verdict)
    except Exception as exc:
        log.warning("policy_apply_failed", error=str(exc))
        scan_errors.append(f"Policy engine error: {exc}")

    # Semantic recall (arch step 02) — find similar past incidents
    recall_section = ""
    try:
        async with SessionLocal() as _mem_db:
            recalls = await recall_similar(
                _mem_db,
                installation_id=installation_id,
                findings=findings,
                exclude_repo=repo_full_name,
            )
        recall_section = format_recall_section(recalls)
    except Exception as exc:
        log.warning("memory_recall_failed", error=str(exc))

    risk_score = _compute_risk(findings)

    # Persist early — before AI review (which is slow) so we don't lose data if process is killed
    analysis_id = await _persist_analysis(
        installation_id=installation_id,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        head_sha=head_sha,
        findings=findings,
        review_md="",  # updated below once AI review completes
        risk_score=risk_score,
        duration_ms=0,
    )
    log.info("analysis_early_persisted", analysis_id=analysis_id)

    try:
        review_md = await ai_review(findings, pr_ctx)
    except Exception as exc:
        log.warning("ai_review_failed", error=str(exc))
        scan_errors.append(f"AI review unavailable: {exc}")
        sev_counts = {}
        for f in findings:
            sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1
        summary = ", ".join(f"{v} {k}" for k, v in sorted(sev_counts.items()))
        review_md = f"## Summary\n{len(findings)} findings detected ({summary}).\n\n_AI review unavailable._"
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
    # Inject recall section before footer
    if recall_section:
        body = body.replace("\n\n---\n", recall_section + "\n\n---\n", 1)

    await post_pr_comment(token, repo_full_name, pr_number, body)

    # GitHub Check Run — gates merge button when branch protection requires it
    crit_high_count = sum(1 for f in findings if f.severity in ("critical", "high"))
    if risk_score >= 70 or crit_high_count >= 3:
        conclusion = "failure"
        title = f"Blocked — {crit_high_count} critical/high findings · risk {risk_score}/100"
    elif risk_score >= 40 or crit_high_count >= 1:
        conclusion = "neutral"
        title = f"Warnings — {crit_high_count} high-severity findings · risk {risk_score}/100"
    else:
        conclusion = "success"
        title = f"Approved — risk {risk_score}/100 · no critical findings"

    try:
        await post_check_run(
            token,
            repo_full_name,
            head_sha,
            conclusion=conclusion,
            title=title,
            summary=f"{len(findings)} findings. {crit_high_count} critical/high. Risk score: {risk_score}/100.",
        )
    except Exception as exc:  # noqa: BLE001 — check run is non-critical
        log.warning("check_run_post_failed", error=str(exc))

    # Formal PR review — REQUEST_CHANGES blocks merge (like Gemini Code Assist)
    try:
        if conclusion == "failure":
            review_event = "REQUEST_CHANGES"
            review_body = (
                f"🔴 **DriftGuard: {crit_high_count} critical/high findings require attention before merge.**"
                " See comment above for details."
            )
        elif conclusion == "neutral":
            review_event = "COMMENT"
            review_body = f"🟠 **DriftGuard: {crit_high_count} high-severity findings detected.** Review recommended."
        else:
            review_event = "APPROVE"
            review_body = f"🟢 **DriftGuard: No critical findings.** Risk score {risk_score}/100. Safe to merge."
        from driftguard.integrations.github import fetch_pr_files
        from driftguard.services.inline_review import (
            build_inline_review,
            inline_comments_payload,
            parse_pr_files,
        )

        inline_payload: list[dict] = []
        try:
            pr_files = await fetch_pr_files(token, repo_full_name, pr_number)
            diff_files = parse_pr_files(pr_files)
            inline_result = build_inline_review(findings, diff_files)
            inline_payload = inline_comments_payload(inline_result)
            log.info(
                "inline_review_built",
                inline=len(inline_payload),
                unmapped=len(inline_result.unmapped_findings),
                skipped=len(inline_result.skipped_findings),
            )
        except Exception as exc:  # noqa: BLE001 — inline review is non-critical
            log.warning("inline_review_build_failed", error=str(exc))

        await submit_pr_review(
            token,
            repo_full_name,
            pr_number,
            head_sha,
            event=review_event,
            body=review_body,
            inline_comments=inline_payload or None,
        )
    except Exception as exc:  # noqa: BLE001 — review is non-critical
        log.warning("submit_review_failed", error=str(exc))

    # Update analysis record with final review_md + duration (persisted early above)
    try:
        from sqlalchemy import select

        from driftguard.db.models import Analysis as _Analysis

        async with SessionLocal() as _upd_db:
            _analysis_row = (
                await _upd_db.execute(select(_Analysis).where(_Analysis.id == analysis_id))
            ).scalar_one_or_none()
            if _analysis_row:
                _analysis_row.summary_md = review_md
                _analysis_row.files_scanned = files_scanned
                _analysis_row.tf_files = tf_files
                _analysis_row.k8s_files = k8s_files
                _analysis_row.gha_files = gha_files
                _analysis_row.scan_errors = scan_errors or None
                _analysis_row.finished_at = datetime.now(UTC)
                _analysis_row.policy_verdict = policy_verdict
                await _upd_db.commit()
    except Exception as exc:
        log.warning("analysis_update_failed", error=str(exc))

    # Store memory (arch step 05 partial — immediate storage, outcome updated on merge)
    try:
        outcome = "blocked" if conclusion == "failure" else "warned" if conclusion == "neutral" else "approved"
        from sqlalchemy import select

        from driftguard.db.models import Organization as _Org

        async with SessionLocal() as _mem_db:
            _org = (
                (
                    await _mem_db.execute(
                        select(_Org)
                        .where(_Org.github_installation_id == installation_id)
                        .order_by(_Org.created_at.desc())
                    )
                )
                .scalars()
                .first()
            )
            if _org:
                await store_memory(
                    _mem_db,
                    org_id=_org.id,
                    analysis_id=analysis_id,
                    repo_full_name=repo_full_name,
                    pr_number=pr_number,
                    findings=[f for f in findings if f.type != "policy"],
                    outcome=outcome,
                    risk_score=risk_score,
                )
    except Exception as exc:
        log.warning("memory_store_failed", error=str(exc))

    # Auto-create/update DriftIncidents for critical/high findings
    try:
        import hashlib

        from sqlalchemy import and_, select

        from driftguard.db.models import DriftIncident
        from driftguard.db.models import Organization as _OrgInc
        from driftguard.db.models import Repository as _RepoInc

        async with SessionLocal() as _inc_db:
            _org_inc = (
                (
                    await _inc_db.execute(
                        select(_OrgInc)
                        .where(_OrgInc.github_installation_id == installation_id)
                        .order_by(_OrgInc.created_at.desc())
                    )
                )
                .scalars()
                .first()
            )
            if _org_inc:
                _repo_inc = (
                    await _inc_db.execute(select(_RepoInc).where(_RepoInc.full_name == repo_full_name))
                ).scalar_one_or_none()
                _repo_inc_id = _repo_inc.id if _repo_inc else None

                now = datetime.now(UTC)
                for _f in findings:
                    if _f.severity not in ("critical", "high"):
                        continue
                    _raw = f"security_finding:{repo_full_name}:{' '.join(_f.message.lower().split())[:200]}"
                    _fp = hashlib.sha256(_raw.encode()).hexdigest()[:16]
                    _existing = (
                        await _inc_db.execute(
                            select(DriftIncident).where(
                                and_(
                                    DriftIncident.org_id == _org_inc.id,
                                    DriftIncident.fingerprint == _fp,
                                    DriftIncident.status != "resolved",
                                )
                            )
                        )
                    ).scalar_one_or_none()
                    if _existing:
                        _existing.recurrence_count += 1
                        _existing.last_seen_at = now
                    else:
                        _title = _f.message[:80] if len(_f.message) > 80 else _f.message
                        _inc_db.add(
                            DriftIncident(
                                org_id=_org_inc.id,
                                repo_id=_repo_inc_id,
                                title=_title,
                                description=_f.message,
                                severity=_f.severity,
                                status="open",
                                suggested_fix=_f.suggestion,
                                fingerprint=_fp,
                                first_seen_at=now,
                                last_seen_at=now,
                            )
                        )
                await _inc_db.commit()
    except Exception as _exc:  # noqa: BLE001
        log.warning("incident_upsert_failed", error=str(_exc))

    # Audit log — DORA/NIS2 evidence
    try:
        from sqlalchemy import select

        from driftguard.db.models import Repository, RuntimeEvent
        from driftguard.services.audit import record as _audit

        async with SessionLocal() as _db:
            _repo = (
                await _db.execute(select(Repository).where(Repository.full_name == repo_full_name))
            ).scalar_one_or_none()
            _org_id = _repo.org_id if _repo else None
            if not _org_id:
                raise ValueError(f"org not found for {repo_full_name}")

            # Emit RuntimeEvent so the dashboard event feed shows activity
            _sev = "critical" if risk_score >= 70 else "warn" if risk_score >= 40 else "info"
            _msg = f"PR #{pr_number} reviewed — risk {risk_score}/100, {len(findings)} findings" + (
                f", {crit_high_count} critical/high" if crit_high_count else ""
            )
            _db.add(
                RuntimeEvent(
                    org_id=_org_id,
                    repo_id=_repo.id if _repo else None,
                    analysis_id=analysis_id,
                    event_type="analysis.completed",
                    severity=_sev,
                    source="driftguard",
                    message=_msg,
                    metadata_={
                        "repo": repo_full_name,
                        "pr_number": pr_number,
                        "risk_score": risk_score,
                        "findings": len(findings),
                    },
                )
            )

            await _audit(
                _db,
                org_id=_org_id,
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

    # Fire-and-forget notification for high-risk analyses (risk >= 60).
    # Only sends if the org has a contact_email configured; silently skips otherwise.
    if risk_score >= 60 and analysis_id:
        try:
            from driftguard.worker.tasks import _send_notification_async

            asyncio.create_task(_send_notification_async(analysis_id, repo_full_name, pr_number))
        except Exception as _exc:
            log.debug("notification_dispatch_skipped", error=str(_exc))

    # Policy violation notification — notify when a block rule is triggered.
    if policy_verdict == "block" and analysis_id and policy_findings:
        try:
            block_finding = next(
                (f for f in policy_findings if (f.extra or {}).get("rule_type") == "block"),
                policy_findings[0],
            )
            from driftguard.worker.tasks import send_policy_violation_notification

            send_policy_violation_notification.apply_async(
                kwargs={
                    "analysis_id": analysis_id,
                    "repo_full_name": repo_full_name,
                    "pr_number": pr_number,
                    "resource": block_finding.resource or "policy violation",
                    "reason": block_finding.message[:200],
                },
                queue="notifications",
            )
        except Exception as _exc:
            log.debug("policy_violation_notification_skipped", error=str(_exc))

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
