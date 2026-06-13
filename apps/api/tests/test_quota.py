"""Tests for quota enforcement: plan limits, monthly usage, idempotency."""

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.config import settings
from driftguard.db.models import Base, MonthlyUsage, Organization, Repository
from driftguard.services.quota import (
    assert_can_enable_repo,
    auto_disable_excess_repos,
    get_active_repo_count,
    get_monthly_pr_count,
    is_premium,
    try_consume_manual_scan_quota,
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


# ── try_consume_manual_scan_quota ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_manual_scan_free_org_allowed_under_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "free_monthly_scan_limit", 20)
    org = make_org(plan="free", subscription_status="free")
    db.add(org)
    await db.commit()

    result = await try_consume_manual_scan_quota(db, org)
    assert result is True

    count = await get_monthly_pr_count(db, org.id)
    assert count == 1


@pytest.mark.asyncio
async def test_manual_scan_free_org_blocked_at_limit(db, monkeypatch):
    monkeypatch.setattr(settings, "free_monthly_scan_limit", 2)
    org = make_org(plan="free", subscription_status="free")
    db.add(org)
    await db.flush()

    from datetime import UTC, datetime

    month = datetime.now(UTC).strftime("%Y-%m")
    db.add(MonthlyUsage(org_id=org.id, month=month, pr_count=2))
    await db.commit()

    result = await try_consume_manual_scan_quota(db, org)
    assert result is False

    count = await get_monthly_pr_count(db, org.id)
    assert count == 2  # not incremented


@pytest.mark.asyncio
async def test_manual_scan_premium_shares_pr_pool(db, monkeypatch):
    """Premium manual scans draw from the same monthly counter as PR reviews."""
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 3)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.commit()

    assert await try_consume_pr_quota(db, org) is True  # 1
    assert await try_consume_manual_scan_quota(db, org) is True  # 2
    assert await try_consume_pr_quota(db, org) is True  # 3
    assert await try_consume_manual_scan_quota(db, org) is False  # over

    count = await get_monthly_pr_count(db, org.id)
    assert count == 3


@pytest.mark.asyncio
async def test_manual_scan_premium_uses_premium_limit_not_free(db, monkeypatch):
    monkeypatch.setattr(settings, "free_monthly_scan_limit", 1)
    monkeypatch.setattr(settings, "premium_monthly_pr_limit", 50)
    org = make_org(plan="team", subscription_status="premium_active")
    db.add(org)
    await db.flush()

    from datetime import UTC, datetime

    month = datetime.now(UTC).strftime("%Y-%m")
    db.add(MonthlyUsage(org_id=org.id, month=month, pr_count=5))
    await db.commit()

    # 5 used > free limit of 1, but premium limit is 50 → still allowed
    assert await try_consume_manual_scan_quota(db, org) is True


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


# ── auto_disable_excess_repos ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_auto_disable_within_limit_does_nothing(db, monkeypatch):
    """When active repos <= free limit, nothing gets disabled."""
    monkeypatch.setattr(settings, "free_repository_limit", 3)
    org = make_org()
    db.add(org)
    await db.flush()

    for _ in range(2):
        db.add(make_repo(org_id=org.id, enabled=True))
    await db.commit()

    disabled = await auto_disable_excess_repos(db, org.id)
    assert disabled == 0

    count = await get_active_repo_count(db, org.id)
    assert count == 2


@pytest.mark.asyncio
async def test_auto_disable_excess_repos_disables_newest(db, monkeypatch):
    """Excess repos (beyond free limit) are disabled; oldest are kept enabled."""
    monkeypatch.setattr(settings, "free_repository_limit", 2)
    org = make_org()
    db.add(org)
    await db.flush()

    # Add 4 enabled repos
    repos = [make_repo(org_id=org.id, enabled=True) for _ in range(4)]
    for r in repos:
        db.add(r)
    await db.commit()

    disabled = await auto_disable_excess_repos(db, org.id)
    assert disabled == 2

    active = await get_active_repo_count(db, org.id)
    assert active == 2


@pytest.mark.asyncio
async def test_auto_disable_already_disabled_repos_excluded(db, monkeypatch):
    """Disabled repos don't count toward the limit and aren't touched."""
    monkeypatch.setattr(settings, "free_repository_limit", 2)
    org = make_org()
    db.add(org)
    await db.flush()

    db.add(make_repo(org_id=org.id, enabled=True))
    db.add(make_repo(org_id=org.id, enabled=True))
    db.add(make_repo(org_id=org.id, enabled=False))
    await db.commit()

    disabled = await auto_disable_excess_repos(db, org.id)
    assert disabled == 0

    active = await get_active_repo_count(db, org.id)
    assert active == 2


@pytest.mark.asyncio
async def test_auto_disable_exactly_at_limit_does_nothing(db, monkeypatch):
    monkeypatch.setattr(settings, "free_repository_limit", 3)
    org = make_org()
    db.add(org)
    await db.flush()

    for _ in range(3):
        db.add(make_repo(org_id=org.id, enabled=True))
    await db.commit()

    disabled = await auto_disable_excess_repos(db, org.id)
    assert disabled == 0
