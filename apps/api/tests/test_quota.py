"""Tests for quota enforcement: plan limits, monthly usage, idempotency."""

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.config import settings
from driftguard.db.models import Base, MonthlyUsage, Organization, Repository
from driftguard.services.quota import (
    assert_can_enable_repo,
    get_active_repo_count,
    get_monthly_pr_count,
    is_premium,
    try_consume_pr_quota,
    try_record_scan_run,
)


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as session:
        yield session
    await engine.dispose()


def make_org(*, plan: str = "free", subscription_status: str = "free") -> Organization:
    from uuid import uuid4
    return Organization(
        id=str(uuid4()),
        github_installation_id=int(uuid4().int % 10**9),
        plan=plan,
        subscription_status=subscription_status,
    )


def make_repo(*, org_id: str, enabled: bool = True) -> Repository:
    from uuid import uuid4
    return Repository(
        id=str(uuid4()),
        org_id=org_id,
        github_repo_id=int(uuid4().int % 10**9),
        full_name=f"org/repo-{uuid4().hex[:6]}",
        enabled=enabled,
    )


# ── is_premium ────────────────────────────────────────────────────────────────


def test_is_premium_free_org():
    org = make_org(plan="free", subscription_status="free")
    assert not is_premium(org)


def test_is_premium_active_subscription():
    org = make_org(plan="team", subscription_status="premium_active")
    assert is_premium(org)


def test_is_premium_past_due_still_premium():
    org = make_org(plan="team", subscription_status="premium_past_due")
    assert is_premium(org)


def test_is_premium_canceled_not_premium():
    org = make_org(plan="free", subscription_status="premium_canceled")
    assert not is_premium(org)


def test_is_premium_backward_compat_plan_field():
    # Orgs set before subscription_status was added: plan="team" but status="free"
    org = make_org(plan="team", subscription_status="free")
    assert is_premium(org)


# ── get_active_repo_count ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_active_repo_count_counts_only_enabled(db):
    org = make_org()
    db.add(org)
    db.add(make_repo(org_id=org.id, enabled=True))
    db.add(make_repo(org_id=org.id, enabled=True))
    db.add(make_repo(org_id=org.id, enabled=False))
    await db.commit()

    count = await get_active_repo_count(db, org.id)
    assert count == 2


# ── assert_can_enable_repo ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_free_plan_can_enable_within_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "free_repository_limit", 3)
    org = make_org(plan="free", subscription_status="free")
    db.add(org)
    db.add(make_repo(org_id=org.id, enabled=True))
    db.add(make_repo(org_id=org.id, enabled=True))
    await db.commit()

    # 2 enabled, limit=3 → should not raise
    await assert_can_enable_repo(db, org)


@pytest.mark.asyncio
async def test_free_plan_cannot_enable_at_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "free_repository_limit", 3)
    org = make_org(plan="free", subscription_status="free")
    db.add(org)
    for _ in range(3):
        db.add(make_repo(org_id=org.id, enabled=True))
    await db.commit()

    with pytest.raises(ValueError, match="Free plan allows 3"):
        await assert_can_enable_repo(db, org)


@pytest.mark.asyncio
async def test_premium_plan_ignores_repo_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "free_repository_limit", 3)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    for _ in range(10):
        db.add(make_repo(org_id=org.id, enabled=True))
    await db.commit()

    await assert_can_enable_repo(db, org)  # should not raise


# ── try_consume_pr_quota ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_free_org_always_allowed(db):
    org = make_org(plan="free", subscription_status="free")
    db.add(org)
    await db.commit()

    result = await try_consume_pr_quota(db, org)
    assert result is True  # Free plan has no PR quota


@pytest.mark.asyncio
async def test_premium_org_first_pr_allowed(db, monkeypatch):
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 50)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.commit()

    result = await try_consume_pr_quota(db, org)
    assert result is True

    count = await get_monthly_pr_count(db, org.id)
    assert count == 1


@pytest.mark.asyncio
async def test_premium_org_50th_pr_allowed(db, monkeypatch):
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 50)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.flush()

    from datetime import UTC, datetime
    month = datetime.now(UTC).strftime("%Y-%m")
    usage = MonthlyUsage(org_id=org.id, month=month, pr_count=49)
    db.add(usage)
    await db.commit()

    result = await try_consume_pr_quota(db, org)
    assert result is True

    count = await get_monthly_pr_count(db, org.id)
    assert count == 50


@pytest.mark.asyncio
async def test_premium_org_51st_pr_blocked(db, monkeypatch):
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 50)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.flush()

    from datetime import UTC, datetime
    month = datetime.now(UTC).strftime("%Y-%m")
    usage = MonthlyUsage(org_id=org.id, month=month, pr_count=50)
    db.add(usage)
    await db.commit()

    result = await try_consume_pr_quota(db, org)
    assert result is False

    count = await get_monthly_pr_count(db, org.id)
    assert count == 50  # not incremented


# ── try_record_scan_run ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_scan_run_first_time_returns_true(db):
    org = make_org()
    db.add(org)
    await db.commit()

    result = await try_record_scan_run(db, org.id, "repo-123", 42, "abc" * 13 + "a")
    assert result is True


@pytest.mark.asyncio
async def test_scan_run_duplicate_returns_false(db):
    org = make_org()
    db.add(org)
    await db.commit()

    sha = "abc" * 13 + "a"
    await try_record_scan_run(db, org.id, "repo-123", 42, sha)

    result = await try_record_scan_run(db, org.id, "repo-123", 42, sha)
    assert result is False


@pytest.mark.asyncio
async def test_scan_run_different_sha_not_duplicate(db):
    org = make_org()
    db.add(org)
    await db.commit()

    result1 = await try_record_scan_run(db, org.id, "repo-123", 42, "a" * 40)
    result2 = await try_record_scan_run(db, org.id, "repo-123", 42, "b" * 40)
    assert result1 is True
    assert result2 is True


@pytest.mark.asyncio
async def test_scan_run_new_month_resets(db, monkeypatch):
    """New month = new usage row, quota resets."""
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 2)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.flush()

    # Manually fill July
    usage = MonthlyUsage(org_id=org.id, month="2026-07", pr_count=2)
    db.add(usage)
    await db.commit()

    # get_monthly_pr_count for current month (different from July) should be 0
    count = await get_monthly_pr_count(db, org.id, "2026-08")
    assert count == 0
