"""Celery tasks — async wrappers around the analyzer pipeline."""

from __future__ import annotations

import asyncio

from celery.utils.log import get_task_logger

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
        from driftguard.analyzer import analyze_pr  # fixed: was driftguard.workers.analyzer

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

        ie = IncidentEmbedding(
            id=str(uuid.uuid4()),
            org_id=repo.org_id,
            analysis_id=analysis_id,
            repo_full_name=repo.full_name,
            pr_number=pr.github_pr_number,
            intent_text=text,
            severity=top_sev,
            outcome="blocked" if analysis.risk_score and analysis.risk_score > 70 else "allowed",
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


async def _send_notification_async(analysis_id: str, repo_full_name: str, pr_number: int) -> None:

    from driftguard.core.db import SessionLocal
    from driftguard.db.models import Analysis, Organization, PullRequest, Repository
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

        findings_count = len(
            (
                await session.execute(
                    __import__("sqlalchemy")
                    .select(__import__("driftguard.db.models", fromlist=["Finding"]).Finding)
                    .where(__import__("driftguard.db.models", fromlist=["Finding"]).Finding.analysis_id == analysis_id)
                )
            )
            .scalars()
            .all()
        )

        await send_review_complete(
            to=org.contact_email,
            repo=repo_full_name,
            pr_number=pr_number,
            risk_score=analysis.risk_score,
            findings_count=findings_count,
            analysis_url=f"https://driftguard.io/dashboard/{org.installation_id}/analyses/{analysis_id}",
        )
