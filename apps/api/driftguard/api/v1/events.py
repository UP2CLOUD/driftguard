"""RuntimeEvents list endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import Organization, RuntimeEvent

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
async def list_events(
    installation_id: int = Query(...),
    event_type: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    try:
        org = (
            await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
        ).scalar_one_or_none()
    except Exception:
        return []
    if not org:
        return []

    stmt = (
        select(RuntimeEvent).where(RuntimeEvent.org_id == org.id).order_by(RuntimeEvent.created_at.desc()).limit(limit)
    )
    if event_type:
        stmt = stmt.where(RuntimeEvent.event_type == event_type)
    if severity:
        stmt = stmt.where(RuntimeEvent.severity == severity)

    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "severity": r.severity,
            "source": r.source,
            "message": r.message,
            "metadata": r.metadata_,
            "repo_id": r.repo_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
