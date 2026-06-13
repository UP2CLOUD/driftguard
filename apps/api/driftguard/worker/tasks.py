"""Celery tasks — async wrappers around the analyzer pipeline."""

from __future__ import annotations

import asyncio

from celery.utils.log import get_task_logger

from driftguard.core.config import settings
from driftguard.worker.app import celery_app

log = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    name="driftguard.worker.tasks.run_analysis",
    queue="analysis",
    max_retries=3,
    default_retry_delay=30,
    acks_late=True,
)
def run_analysis(
    self,
    *,
    installation_id: int,
    repo_full_name: str,
    pr_number: int,
    head_sha: str,
) -> dict:
    try:
        from driftguard.workers.analyzer import analyze_pr

        result = asyncio.run(
            analyze_pr(
                installation_id=installation_id,
                repo_full_name=repo_full_name,
                pr_number=pr_number,
                head_sha=head_sha,
            )
        )
        analysis_id = (result or {}).get("analysis_id")
        if analysis_id:
            store_embedding.apply_async(
                kwargs={"analysis_id": analysis_id},
                queue="analysis",
            )
            send_notification.apply_async(
                kwargs={
                    "analysis_id": analysis_id,
                    "repo_full_name": repo_full_name,
                    "pr_number": pr_number,
                },
                queue="notifications",
            )
        from driftguard.services.analytics import track

        track(
            "analysis_completed",
            {
                "repo": repo_full_name,
                "pr_number": pr_number,
                "risk_score": (result or {}).get("risk_score"),
            },
        )
        return result or {}
    except Exception as exc:
        log.exception("run_analysis.failed")
        raise self.retry(exc=exc) from exc


@celery_app.task(
    name="driftguard.worker.tasks.store_embedding",
    queue="analysis",
    max_retries=2,
)
def store_embedding(*, analysis_id: str) -> None:
    try:
        asyncio.run(_store_embedding_async(analysis_id))
    except Exception:
        log.exception("store_embedding.failed", extra={"analysis_id": analysis_id})


async def _store_embedding_async(analysis_id: str) -> None:
    import uuid

    import sqlalchemy
    from sqlalchemy import select

    from driftguard.core.db import SessionLocal
    from driftguard.db.models import Analysis, Finding, IncidentEmbedding, PullRequest, Repository
    from driftguard.services.embeddings import embed, intent_text, vec_to_pg

    async with SessionLocal() as session:
        analysis = await session.get(Analysis, analysis_id)
        if not analysis:
            return

        findings_rows = (
            (await session.execute(select(Finding).where(Finding.analysis_id == analysis_id))).scalars().all()
        )

        findings_dicts = [{"severity": f.severity, "resource": f.resource, "message": f.message} for f in findings_rows]
        text = intent_text(findings_dicts, analysis.summary_md or "")
        vec = await embed(text)

        pr = await session.get(PullRequest, analysis.pr_id)
        if not pr:
            return
        repo = await session.get(Repository, pr.repo_id)
        if not repo:
            return

        sev_order = ["low", "medium", "high", "critical"]
        top_sev = max(
            (f["severity"] for f in findings_dicts if f["severity"] in sev_order),
            key=lambda s: sev_order.index(s),
            default=None,
        )

        risk = analysis.risk_score or 0
        blast = "high" if risk >= 70 else "medium" if risk >= 40 else "low"

        ie = IncidentEmbedding(
            id=str(uuid.uuid4()),
            org_id=repo.org_id,
            analysis_id=analysis_id,
            repo_full_name=repo.full_name,
            pr_number=pr.github_pr_number,
            intent_text=text,
            severity=top_sev,
            outcome="blocked" if risk > 70 else "allowed",
            blast_radius=blast,
        )
        session.add(ie)
        await session.flush()
        await session.execute(
            sqlalchemy.text("UPDATE incident_embeddings SET embedding_vec = :v WHERE id = :id"),
            {"v": vec_to_pg(vec), "id": ie.id},
        )
        await session.commit()


@celery_app.task(
    name="driftguard.worker.tasks.send_notification",
    queue="notifications",
    max_retries=2,
)
def send_notification(*, analysis_id: str, repo_full_name: str, pr_number: int) -> None:
    try:
        asyncio.run(_send_notification_async(analysis_id, repo_full_name, pr_number))
    except Exception:
        log.warning("send_notification.failed", extra={"analysis_id": analysis_id})


@celery_app.task(
    name="driftguard.worker.tasks.send_policy_violation_notification",
    queue="notifications",
    max_retries=2,
)
def send_policy_violation_notification(
    *, analysis_id: str, repo_full_name: str, pr_number: int, resource: str, reason: str
) -> None:
    try:
        asyncio.run(_send_policy_violation_async(analysis_id, repo_full_name, pr_number, resource, reason))
    except Exception:
        log.warning("send_policy_violation_notification.failed", extra={"analysis_id": analysis_id})


async def _send_policy_violation_async(
    analysis_id: str, repo_full_name: str, pr_number: int, resource: str, reason: str
) -> None:
    from driftguard.core.db import SessionLocal
    from driftguard.db.models import Analysis, Organization, PullRequest, Repository
    from driftguard.services.email import send_policy_violation

    async with SessionLocal() as session:
        analysis = await session.get(Analysis, analysis_id)
        if not analysis:
            return
        pr = await session.get(PullRequest, analysis.pr_id)
        if not pr:
            return
        repo = await session.get(Repository, pr.repo_id)
        if not repo:
            return
        org = await session.get(Organization, repo.org_id)
        if not org or not getattr(org, "contact_email", None):
            return

        await send_policy_violation(
            to=org.contact_email,
            repo=repo_full_name,
            pr_number=pr_number,
            resource=resource,
            reason=reason,
            analysis_url=f"{settings.public_base_url.rstrip('/')}/dashboard/{org.github_installation_id}/analyses/{analysis_id}",
        )


async def _send_notification_async(analysis_id: str, repo_full_name: str, pr_number: int) -> None:
    from sqlalchemy import func, select

    from driftguard.core.db import SessionLocal
    from driftguard.db.models import Analysis, Finding, Organization, PullRequest, Repository
    from driftguard.services.email import send_review_complete

    async with SessionLocal() as session:
        analysis = await session.get(Analysis, analysis_id)
        if not analysis or analysis.risk_score is None or analysis.risk_score < 60:
            return

        pr = await session.get(PullRequest, analysis.pr_id)
        if not pr:
            return
        repo = await session.get(Repository, pr.repo_id)
        if not repo:
            return

        # Get org owner email
        org = await session.get(Organization, repo.org_id)
        if not org or not getattr(org, "contact_email", None):
            return

        findings_count = (
            await session.execute(select(func.count()).select_from(Finding).where(Finding.analysis_id == analysis_id))
        ).scalar_one()

        await send_review_complete(
            to=org.contact_email,
            repo=repo_full_name,
            pr_number=pr_number,
            risk_score=analysis.risk_score,
            findings_count=findings_count,
            analysis_url=f"{settings.public_base_url.rstrip('/')}/dashboard/{org.github_installation_id}/analyses/{analysis_id}",
        )


@celery_app.task(name="run_manual_scan", bind=True, max_retries=2, default_retry_delay=30)
def run_manual_scan(
    self,
    *,
    installation_id: int,
    repo_full_name: str,
    ref: str | None = None,
) -> dict:
    """
    Download a GitHub repo tarball and run the static scanner on it.
    Persists results as Analysis + Finding rows.
    No terraform binary or AWS credentials needed.
    """
    import asyncio
    import io
    import tarfile
    import tempfile
    from pathlib import Path

    async def _run():

        import httpx
        from sqlalchemy import select
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker as _sm

        from driftguard.api.v1.scans import _persist_scan
        from driftguard.core.config import settings
        from driftguard.db.models import Organization
        from driftguard.services.scanner.engine import scan_directory

        engine = create_async_engine(settings.database_url, echo=False)
        async_session = _sm(engine, class_=AsyncSession, expire_on_commit=False)

        async with async_session() as db:
            org = (
                await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
            ).scalar_one_or_none()
            if not org:
                return {"status": "error", "reason": "org_not_found"}

            # Download tarball (no ref = repository's default branch)
            from driftguard.integrations.github import tarball_url

            url = tarball_url(repo_full_name, ref)
            try:
                from driftguard.integrations.github import installation_token

                token = await installation_token(installation_id)
            except Exception:
                # Fall back to unauthenticated if no GitHub App configured
                token = None

            headers = {"Accept": "application/vnd.github+json"}
            if token:
                headers["Authorization"] = f"Bearer {token}"

            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                resp.raise_for_status()
                archive = resp.content

            # Extract and scan
            with tempfile.TemporaryDirectory() as tmpdir:
                root = Path(tmpdir)
                try:
                    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tf:
                        safe = [m for m in tf.getmembers() if not m.name.startswith("/") and ".." not in m.name]
                        tf.extractall(root, members=safe)  # noqa: S202
                    # GitHub adds a top-level folder — unwrap it
                    subdirs = [d for d in root.iterdir() if d.is_dir()]
                    scan_root = subdirs[0] if len(subdirs) == 1 else root
                except Exception as e:
                    return {"status": "error", "reason": str(e)}

                result = await scan_directory(scan_root)

            ref_label = ref or "default"
            analysis_id = await _persist_scan(
                db=db,
                org_id=org.id,
                result=result,
                source=f"{repo_full_name}@{ref_label}",
                ref=ref_label,
            )
            return {
                "status": "completed",
                "analysis_id": analysis_id,
                "risk_score": result.risk_score,
                "findings": len(result.findings),
            }

    try:
        return asyncio.run(_run())
    except Exception as exc:
        raise self.retry(exc=exc) from exc
