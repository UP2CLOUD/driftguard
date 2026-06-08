"""Quota enforcement: plan limits, monthly usage tracking, idempotency."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.config import settings
from driftguard.core.logging import log
from driftguard.db.models import MonthlyUsage, Organization, Repository, ScanRun


def _uuid() -> str:
    return str(uuid4())


def _current_month() -> str:
    return datetime.now(UTC).strftime("%Y-%m")


def is_premium(org: Organization) -> bool:
    """True when org has an active or past-due premium subscription."""
    if org.subscription_status in {"premium_active", "premium_past_due"}:
        return True
    # Backward compat: orgs whose plan was set before subscription_status was tracked.
    if org.subscription_status == "free" and org.plan in {"pro", "team", "enterprise"}:
        return True
    return False


async def get_active_repo_count(db: AsyncSession, org_id: str) -> int:
    result = await db.execute(
        select(func.count()).select_from(Repository).where(
            Repository.org_id == org_id,
            Repository.enabled.is_(True),
        )
    )
    return result.scalar_one()


async def get_monthly_pr_count(db: AsyncSession, org_id: str, month: str | None = None) -> int:
    month = month or _current_month()
    result = await db.execute(
        select(MonthlyUsage.pr_count).where(
            MonthlyUsage.org_id == org_id,
            MonthlyUsage.month == month,
        )
    )
    return result.scalar_one_or_none() or 0


async def try_consume_pr_quota(db: AsyncSession, org: Organization) -> bool:
    """Atomically check + increment monthly PR count.

    Returns True when the analysis is allowed, False when quota exceeded.
    Free plan orgs always return True (their limit is repo count, not PR count).
    """
    if not is_premium(org):
        return True

    limit = settings.premium_monthly_pr_limit
    month = _current_month()

    # Lock the row to prevent concurrent over-limit writes.
    result = await db.execute(
        select(MonthlyUsage)
        .where(MonthlyUsage.org_id == org.id, MonthlyUsage.month == month)
        .with_for_update()
    )
    usage = result.scalar_one_or_none()
    if usage is None:
        usage = MonthlyUsage(id=_uuid(), org_id=org.id, month=month, pr_count=0)
        db.add(usage)
        await db.flush()

    if usage.pr_count >= limit:
        log.info(
            "monthly_quota_exceeded",
            org_id=org.id,
            month=month,
            count=usage.pr_count,
            limit=limit,
        )
        return False

    usage.pr_count += 1
    await db.flush()
    return True


async def try_record_scan_run(
    db: AsyncSession, org_id: str, repo_id: str, pr_number: int, head_sha: str
) -> bool:
    """Insert a ScanRun row. Returns True if new, False if already seen (duplicate)."""
    existing = await db.execute(
        select(ScanRun).where(
            ScanRun.org_id == org_id,
            ScanRun.repo_id == repo_id,
            ScanRun.pr_number == pr_number,
            ScanRun.head_sha == head_sha,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return False

    run = ScanRun(
        id=_uuid(),
        org_id=org_id,
        repo_id=repo_id,
        pr_number=pr_number,
        head_sha=head_sha,
    )
    db.add(run)
    await db.flush()
    return True


async def assert_can_enable_repo(db: AsyncSession, org: Organization) -> None:
    """Raise ValueError when org is on free plan and already at the repo limit."""
    if is_premium(org):
        return
    count = await get_active_repo_count(db, org.id)
    limit = settings.free_repository_limit
    if count >= limit:
        raise ValueError(
            f"Free plan allows {limit} active repositories. Disable one or upgrade to add more."
        )
