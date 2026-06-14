"""GET /api/v1/dashboard/overview — real aggregated data."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
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
    _auth: str = Depends(require_internal_auth),
) -> dict:
    from driftguard.core.logging import log

    # ── Resolve the org (tolerant of duplicate rows) ─────────────────────────
    # Use .first() rather than scalar_one_or_none() so that a duplicate
    # installation row never raises MultipleResultsFound — which would otherwise
    # collapse a fully-installed org into the "not installed" empty overview.
    org = None
    try:
        org = (
            (await db.execute(select(Organization).where(Organization.github_installation_id == installation_id)))
            .scalars()
            .first()
        )
    except Exception as exc:
        log.error("overview_org_lookup_failed", installation_id=installation_id, error=str(exc))

    if not org:
        try:
            from driftguard.api.v1.orgs import _bootstrap_installation

            org = await _bootstrap_installation(db, installation_id)
        except Exception as exc:
            log.error("overview_bootstrap_failed", installation_id=installation_id, error=str(exc))

    if not org:
        # Genuinely no org for this installation — the app is not installed.
        return _empty_overview(installation_id)

    # Capture the org identity as plain values BEFORE running any aggregate
    # query. A failing sub-query forces db.rollback() inside _safe(), and a
    # rollback expires every ORM instance in the session — touching org_id or
    # org_plan afterwards would trigger a refresh SELECT on the just-rolled-back
    # session and raise, escaping this handler as a 500.
    org_id = org.id
    org_plan = org.plan

    # ── Aggregate dashboard data ─────────────────────────────────────────────
    # Once the org is resolved we ALWAYS return its real org_id, even if the
    # aggregation below fails. Returning org_id=None here would make the
    # dashboard render the "Install GitHub App" prompt for an installed org.
    try:
        return await _build_overview(org_id, org_plan, installation_id, db)
    except Exception as exc:
        log.error("overview_build_failed", installation_id=installation_id, org_id=org_id, error=str(exc))
        return _connected_overview(org_id, org_plan, installation_id)


async def _scalar_one(result_coro):
    """Await an execute() coroutine and return its single scalar value."""
    return (await result_coro).scalar_one()


async def _all(result_coro):
    """Await an execute() coroutine and return all rows."""
    return (await result_coro).all()


async def _safe(db: AsyncSession, coro_factory, default, *, label: str, org_id: str):
    """Run one aggregate query in isolation.

    A failing sub-query (e.g. a transient error or a column the live DB schema
    is briefly missing mid-migration) returns its default instead of aborting
    the whole overview. The session is rolled back so later queries can run.
    """
    try:
        return await coro_factory()
    except Exception as exc:
        import contextlib

        from driftguard.core.logging import log

        log.warning("overview_section_failed", section=label, org_id=org_id, error=str(exc))
        with contextlib.suppress(Exception):
            await db.rollback()
        return default


async def _build_overview(org_id: str, org_plan: str, installation_id: int, db: AsyncSession) -> dict:
    from driftguard.db.models import IncidentEmbedding

    now = datetime.now(UTC)
    window_7d = now - timedelta(days=7)
    window_30d = now - timedelta(days=30)

    # ── Repos ────────────────────────────────────────────────────────────────
    repo_count = await _safe(
        db,
        lambda: _scalar_one(db.execute(select(func.count()).where(Repository.org_id == org_id))),
        0,
        label="repos",
        org_id=org_id,
    )

    # ── Analyses (7d) ────────────────────────────────────────────────────────
    analyses_7d = await _safe(
        db,
        lambda: _scalar_one(
            db.execute(
                select(func.count())
                .select_from(Analysis)
                .join(PullRequest, Analysis.pr_id == PullRequest.id)
                .join(Repository, PullRequest.repo_id == Repository.id)
                .where(Repository.org_id == org_id, Analysis.started_at >= window_7d)
            )
        ),
        0,
        label="analyses_7d",
        org_id=org_id,
    )

    # ── Avg risk (7d) ────────────────────────────────────────────────────────
    avg_risk_row = await _safe(
        db,
        lambda: _scalar_one(
            db.execute(
                select(func.avg(Analysis.risk_score))
                .select_from(Analysis)
                .join(PullRequest, Analysis.pr_id == PullRequest.id)
                .join(Repository, PullRequest.repo_id == Repository.id)
                .where(Repository.org_id == org_id, Analysis.started_at >= window_7d)
            )
        ),
        None,
        label="avg_risk_7d",
        org_id=org_id,
    )
    avg_risk = round(float(avg_risk_row), 1) if avg_risk_row else None

    # ── Findings by severity ────────────────────────────────────────────────
    severity_rows = await _safe(
        db,
        lambda: _all(
            db.execute(
                select(Finding.severity, func.count())
                .join(Analysis, Finding.analysis_id == Analysis.id)
                .join(PullRequest, Analysis.pr_id == PullRequest.id)
                .join(Repository, PullRequest.repo_id == Repository.id)
                .where(Repository.org_id == org_id, Analysis.started_at >= window_30d)
                .group_by(Finding.severity)
            )
        ),
        [],
        label="severity_breakdown",
        org_id=org_id,
    )
    severity_breakdown = {row[0]: row[1] for row in severity_rows}

    # ── Drift incidents ──────────────────────────────────────────────────────
    open_incidents = await _safe(
        db,
        lambda: _scalar_one(
            db.execute(
                select(func.count()).where(
                    DriftIncident.org_id == org_id,
                    DriftIncident.status == "open",
                )
            )
        ),
        0,
        label="open_incidents",
        org_id=org_id,
    )

    critical_incidents = await _safe(
        db,
        lambda: _scalar_one(
            db.execute(
                select(func.count()).where(
                    DriftIncident.org_id == org_id,
                    DriftIncident.status == "open",
                    DriftIncident.severity == "critical",
                )
            )
        ),
        0,
        label="critical_incidents",
        org_id=org_id,
    )

    # ── Memory entries ───────────────────────────────────────────────────────
    memory_count = await _safe(
        db,
        lambda: _scalar_one(db.execute(select(func.count()).where(IncidentEmbedding.org_id == org_id))),
        0,
        label="memory_entries",
        org_id=org_id,
    )

    # ── Recent events (last 10) ──────────────────────────────────────────────
    # Serialize to plain dicts INSIDE _safe so a later section's rollback (which
    # expires ORM instances) can never break these rows during response render.
    recent_events = await _safe(
        db,
        lambda: _recent_events(db, org_id),
        [],
        label="recent_events",
        org_id=org_id,
    )

    # ── Recent analyses (last 5) ─────────────────────────────────────────────
    recent_analyses = await _safe(
        db,
        lambda: _recent_analyses(db, org_id),
        [],
        label="recent_analyses",
        org_id=org_id,
    )

    return {
        "org_id": org_id,
        "installation_id": installation_id,
        "plan": org_plan,
        "repos": repo_count,
        "analyses_7d": analyses_7d,
        "avg_risk_7d": avg_risk,
        "open_incidents": open_incidents,
        "critical_incidents": critical_incidents,
        "memory_entries": memory_count,
        "severity_breakdown": severity_breakdown,
        "recent_events": recent_events,
        "recent_analyses": recent_analyses,
    }


async def _recent_events(db: AsyncSession, org_id: str) -> list[dict]:
    rows = (
        (
            await db.execute(
                select(RuntimeEvent)
                .where(RuntimeEvent.org_id == org_id)
                .order_by(RuntimeEvent.created_at.desc())
                .limit(10)
            )
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "severity": e.severity,
            "source": e.source,
            "message": e.message[:120] if e.message else "",
            "analysis_id": e.analysis_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]


async def _recent_analyses(db: AsyncSession, org_id: str) -> list[dict]:
    rows = (
        await db.execute(
            select(Analysis, PullRequest, Repository)
            .join(PullRequest, Analysis.pr_id == PullRequest.id)
            .join(Repository, PullRequest.repo_id == Repository.id)
            .where(Repository.org_id == org_id)
            .order_by(Analysis.started_at.desc().nulls_last())
            .limit(5)
        )
    ).all()
    return [
        {
            "id": a.id,
            "status": a.status,
            "risk_score": a.risk_score,
            "policy_verdict": a.policy_verdict,
            "pr_number": p.github_pr_number,
            "head_sha": p.head_sha,
            "repo_full_name": r.full_name,
            "created_at": a.started_at.isoformat() if a.started_at else None,
        }
        for a, p, r in rows
    ]


def _empty_overview(installation_id: int | None = None) -> dict:
    return {
        "org_id": None,
        "installation_id": installation_id,
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


def _connected_overview(org_id: str, org_plan: str, installation_id: int | None = None) -> dict:
    """Fallback when the org is known but data aggregation failed.

    Preserves the real org_id so the dashboard renders the connected (empty)
    state rather than the misleading "Install GitHub App" prompt.
    """
    overview = _empty_overview(installation_id)
    overview["org_id"] = org_id
    overview["plan"] = org_plan
    return overview
