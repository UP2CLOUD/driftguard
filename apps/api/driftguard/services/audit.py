"""Audit log service — write immutable records for DORA/NIS2 evidence."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.logging import log
from driftguard.db.models import AuditLog


async def record(
    db: AsyncSession,
    *,
    org_id: str,
    action: str,
    actor: str | None = None,
    target: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """Write a single audit record.

    Call this fire-and-forget — errors are logged, never raised.
    Actions use dot-notation: analysis.completed, policy.blocked, plan.updated, etc.
    """
    try:
        entry = AuditLog(
            id=str(uuid.uuid4()),
            org_id=org_id,
            actor=actor,
            action=action,
            target=target,
            payload=payload or {},
        )
        db.add(entry)
        await db.flush()
        log.debug("audit.recorded", org_id=org_id, action=action, target=target)
    except Exception as exc:  # noqa: BLE001
        log.error("audit.write_failed", org_id=org_id, action=action, error=str(exc))
