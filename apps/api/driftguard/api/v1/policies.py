"""Policy rules CRUD — runtime guardrails."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.core.rate_limit import rate_limit
from driftguard.db.models import Organization, PolicyRule

router = APIRouter(prefix="/policies", tags=["policies"])

VALID_RULE_TYPES = {"block", "warn", "alert"}


class PolicyCreate(BaseModel):
    name: str
    description: str | None = None
    rule_type: str = "block"
    severity: str = "high"
    enabled: bool = True
    conditions: dict | None = None
    actions: dict | None = None


class PolicyPatch(BaseModel):
    name: str | None = None
    description: str | None = None
    rule_type: str | None = None
    severity: str | None = None
    enabled: bool | None = None
    conditions: dict | None = None
    actions: dict | None = None


@router.get("")
async def list_policies(
    installation_id: int = Query(...),
    enabled_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    ).scalar_one_or_none()
    if not org:
        return []

    stmt = select(PolicyRule).where(PolicyRule.org_id == org.id).order_by(PolicyRule.created_at.desc())
    if enabled_only:
        stmt = stmt.where(PolicyRule.enabled.is_(True))

    rows = (await db.execute(stmt)).scalars().all()
    return [_ser(r) for r in rows]


@router.post("", status_code=201)
async def create_policy(
    body: PolicyCreate,
    installation_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit(per_minute=20, per_hour=200)),
) -> dict:
    if body.rule_type not in VALID_RULE_TYPES:
        raise HTTPException(422, f"rule_type must be one of: {VALID_RULE_TYPES}")

    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(404, "installation not found")

    rule = PolicyRule(
        org_id=org.id,
        name=body.name,
        description=body.description,
        rule_type=body.rule_type,
        severity=body.severity,
        enabled=body.enabled,
        conditions=body.conditions,
        actions=body.actions,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return _ser(rule)


@router.patch("/{rule_id}")
async def patch_policy(
    rule_id: str,
    body: PolicyPatch,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit(per_minute=20, per_hour=200)),
) -> dict:
    rule = await db.get(PolicyRule, rule_id)
    if not rule:
        raise HTTPException(404, "policy rule not found")

    if body.rule_type is not None and body.rule_type not in VALID_RULE_TYPES:
        raise HTTPException(422, f"rule_type must be one of: {VALID_RULE_TYPES}")

    for field in ("name", "description", "rule_type", "severity", "enabled", "conditions", "actions"):
        val = getattr(body, field)
        if val is not None:
            setattr(rule, field, val)

    rule.updated_at = datetime.now(UTC)
    await db.commit()
    return _ser(rule)


@router.delete("/{rule_id}", status_code=204)
async def delete_policy(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit(per_minute=20, per_hour=200)),
) -> None:
    rule = await db.get(PolicyRule, rule_id)
    if not rule:
        raise HTTPException(404, "policy rule not found")
    await db.delete(rule)
    await db.commit()


def _ser(r: PolicyRule) -> dict:
    return {
        "id": r.id,
        "org_id": r.org_id,
        "name": r.name,
        "description": r.description,
        "rule_type": r.rule_type,
        "severity": r.severity,
        "enabled": r.enabled,
        "conditions": r.conditions,
        "actions": r.actions,
        "match_count": r.match_count,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
