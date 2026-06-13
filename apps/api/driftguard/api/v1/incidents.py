"""Incidents API — DriftIncident CRUD."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import AuditLog, DriftIncident, Organization

router = APIRouter(prefix="/incidents", tags=["incidents"])

VALID_STATUSES = {"open", "investigating", "resolved", "suppressed"}


VALID_SEVERITIES = {"low", "medium", "high", "critical"}


class IncidentPatch(BaseModel):
    status: str | None = None
    severity: str | None = None
    title: str | None = None
    description: str | None = None
    root_cause: str | None = None
    suggested_fix: str | None = None


@router.get("")
async def list_incidents(
    installation_id: int = Query(...),
    status: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    ).scalar_one_or_none()
    if not org:
        return []

    stmt = (
        select(DriftIncident)
        .where(DriftIncident.org_id == org.id)
        .order_by(DriftIncident.last_seen_at.desc().nulls_last())
        .limit(limit)
        .offset(offset)
    )
    if status:
        stmt = stmt.where(DriftIncident.status == status)
    if severity:
        stmt = stmt.where(DriftIncident.severity == severity)

    rows = (await db.execute(stmt)).scalars().all()
    return [_serialize(r) for r in rows]


@router.get("/{incident_id}")
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    inc = await db.get(DriftIncident, incident_id)
    if not inc:
        raise HTTPException(404, "incident not found")
    return _serialize(inc)


@router.patch("/{incident_id}")
async def patch_incident(
    incident_id: str,
    body: IncidentPatch,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    inc = await db.get(DriftIncident, incident_id)
    if not inc:
        raise HTTPException(404, "incident not found")

    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(422, f"status must be one of: {VALID_STATUSES}")
        prev_status = inc.status
        inc.status = body.status
        if body.status == "resolved" and not inc.resolved_at:
            inc.resolved_at = datetime.now(UTC)
        if prev_status != body.status:
            db.add(
                AuditLog(
                    org_id=inc.org_id,
                    actor="api",
                    action="incident.status_changed",
                    target=incident_id,
                    payload={"from": prev_status, "to": body.status, "title": inc.title},
                )
            )
    if body.severity is not None:
        if body.severity not in VALID_SEVERITIES:
            raise HTTPException(422, f"severity must be one of: {VALID_SEVERITIES}")
        inc.severity = body.severity
    if body.title is not None:
        inc.title = body.title
    if body.description is not None:
        inc.description = body.description
    if body.root_cause is not None:
        inc.root_cause = body.root_cause
    if body.suggested_fix is not None:
        inc.suggested_fix = body.suggested_fix

    inc.updated_at = datetime.now(UTC)
    await db.commit()
    return _serialize(inc)


def _serialize(inc: DriftIncident) -> dict:
    return {
        "id": inc.id,
        "org_id": inc.org_id,
        "repo_id": inc.repo_id,
        "title": inc.title,
        "description": inc.description,
        "severity": inc.severity,
        "status": inc.status,
        "root_cause": inc.root_cause,
        "suggested_fix": inc.suggested_fix,
        "recurrence_count": inc.recurrence_count,
        "fingerprint": inc.fingerprint,
        "first_seen_at": inc.first_seen_at.isoformat() if inc.first_seen_at else None,
        "last_seen_at": inc.last_seen_at.isoformat() if inc.last_seen_at else None,
        "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        "created_at": inc.created_at.isoformat() if inc.created_at else None,
    }
