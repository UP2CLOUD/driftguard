"""GET /api/v1/dashboard/overview — real aggregated data."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import (
    Analysis,
    DriftIncident,
    Finding,
    Organization,
    PullRequest,
    Repository,
    RuntimeEvent,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
async def overview(
    installation_id: int = Query(..., description="GitHub App installation ID"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Resolve org
    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    ).scalar_one_or_none()

    if not org:
        return _empty_overview()

    try:
        return await _build_overview(org, installation_id, db)
    except Exception as exc:
        from driftguard.core.logging import log
        log.error("overview_failed", installation_id=installation_id, error=str(exc))
        return _empty_overview()


async def _build_overview(org, installation_id: int, db: AsyncSession) -> dict:
    now = datetime.now(UTC)
    window_7d = now - timedelta(days=7)
    window_30d = now - timedelta(days=30)

    # ── Repos ────────────────────────────────────────────────────────────────
    repo_count = (
        await db.execute(select(func.count()).where(Repository.org_id == org.id, Repository.enabled.is_(True)))
    ).scalar_one()

    # ── Analyses (7d) ────────────────────────────────────────────────────────
    analyses_7d = (
        await db.execute(
            select(func.count())
            .select_from(Analysis)
            .join(PullRequest, Analysis.pr_id == PullRequest.id)
            .join(Repository, PullRequest.repo_id == Repository.id)
            .where(Repository.org_id == org.id, Analysis.started_at >= window_7d)
        )
    ).scalar_one()

    # ── Avg risk (7d) ────────────────────────────────────────────────────────
    avg_risk_row = (
        await db.execute(
            select(func.avg(Analysis.risk_score))
            .select_from(Analysis)
            .join(PullRequest, Analysis.pr_id == PullRequest.id)
            .join(Repository, PullRequest.repo_id == Repository.id)
            .where(Repository.org_id == org.id, Analysis.started_at >= window_7d)
        )
    ).scalar_one()
    avg_risk = round(float(avg_risk_row), 1) if avg_risk_row else None

    # ── Findings by severity ────────────────────────────────────────────────
    severity_rows = (
        await db.execute(
            select(Finding.severity, func.count())
            .join(Analysis, Finding.analysis_id == Analysis.id)
            .join(PullRequest, Analysis.pr_id == PullRequest.id)
            .join(Repository, PullRequest.repo_id == Repository.id)
            .where(Repository.org_id == org.id, Analysis.started_at >= window_30d)
            .group_by(Finding.severity)
        )
    ).all()
    severity_breakdown = {row[0]: row[1] for row in severity_rows}

    # ── Drift incidents ──────────────────────────────────────────────────────
    open_incidents = (
        await db.execute(
            select(func.count()).where(
                DriftIncident.org_id == org.id,
                DriftIncident.status == "open",
            )
        )
    ).scalar_one()

    critical_incidents = (
        await db.execute(
            select(func.count()).where(
                DriftIncident.org_id == org.id,
                DriftIncident.status == "open",
                DriftIncident.severity == "critical",
            )
        )
    ).scalar_one()

    # ── Memory entries ───────────────────────────────────────────────────────
    from driftguard.db.models import IncidentEmbedding

    memory_count = (await db.execute(select(func.count()).where(IncidentEmbedding.org_id == org.id))).scalar_one()

    # ── Recent events (last 10) ──────────────────────────────────────────────
    recent_events = (
        (
            await db.execute(
                select(RuntimeEvent)
                .where(RuntimeEvent.org_id == org.id)
                .order_by(RuntimeEvent.created_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )

    # ── Recent analyses (last 5) ─────────────────────────────────────────────
    recent_analyses_rows = (
        await db.execute(
            select(Analysis, PullRequest, Repository)
            .join(PullRequest, Analysis.pr_id == PullRequest.id)
            .join(Repository, PullRequest.repo_id == Repository.id)
            .where(Repository.org_id == org.id)
            .order_by(Analysis.started_at.desc())
            .limit(5)
        )
    ).all()

    return {
        "org_id": org.id,
        "installation_id": installation_id,
        "plan": org.plan,
        "repos": repo_count,
        "analyses_7d": analyses_7d,
        "avg_risk_7d": avg_risk,
        "open_incidents": open_incidents,
        "critical_incidents": critical_incidents,
        "memory_entries": memory_count,
        "severity_breakdown": severity_breakdown,
        "recent_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "source": e.source,
                "message": e.message[:120],
                "created_at": e.created_at.isoformat(),
            }
            for e in recent_events
        ],
        "recent_analyses": [
            {
                "id": a.id,
                "status": a.status,
                "risk_score": a.risk_score,
                "pr_number": p.github_pr_number,
                "head_sha": p.head_sha,
                "repo_full_name": r.full_name,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a, p, r in recent_analyses_rows
        ],
    }


def _empty_overview() -> dict:
    return {
        "org_id": None,
        "plan": "free",
        "repos": 0,
        "analyses_7d": 0,
        "avg_risk_7d": None,
        "open_incidents": 0,
        "critical_incidents": 0,
        "memory_entries": 0,
        "severity_breakdown": {},
        "recent_events": [],
        "recent_analyses": [],
    }
