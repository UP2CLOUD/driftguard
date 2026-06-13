from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.db.models import Base, Organization, Repository
from driftguard.main import app
from driftguard.services.billing import (
    apply_subscription_event,
    get_or_create_customer,
    plan_for_price,
    price_for_plan,
    stripe_configured,
)


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    await engine.dispose()


@pytest.fixture
def stripe_prices(monkeypatch):
    monkeypatch.setattr(settings, "stripe_price_pro", "price_pro_xyz")
    monkeypatch.setattr(settings, "stripe_price_team", "price_team_xyz")


def test_price_plan_roundtrip(stripe_prices):
    assert price_for_plan("pro") == "price_pro_xyz"
    assert price_for_plan("team") == "price_team_xyz"
    assert price_for_plan("free") is None
    assert plan_for_price("price_pro_xyz") == "pro"
    assert plan_for_price("price_team_xyz") == "team"
    assert plan_for_price("unknown") == "free"


@pytest.mark.asyncio
async def test_get_or_create_customer_creates_when_missing(db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    org = Organization(github_installation_id=1234, plan="free")
    db.add(org)
    await db.commit()

    fake_customer = MagicMock(id="cus_TEST123")
    with patch("driftguard.services.billing.stripe") as mock_stripe:
        mock_stripe.Customer.create.return_value = fake_customer
        cid = await get_or_create_customer(db, org, email="user@example.com")

    assert cid == "cus_TEST123"
    assert org.stripe_customer_id == "cus_TEST123"


@pytest.mark.asyncio
async def test_get_or_create_customer_reuses(db):
    org = Organization(github_installation_id=2222, plan="free", stripe_customer_id="cus_existing")
    db.add(org)
    await db.commit()

    with patch("driftguard.services.billing.stripe") as mock_stripe:
        cid = await get_or_create_customer(db, org, email=None)
        assert not mock_stripe.Customer.create.called

    assert cid == "cus_existing"


@pytest.mark.asyncio
async def test_subscription_created_sets_pro(db, stripe_prices):
    org = Organization(github_installation_id=3333, plan="free", stripe_customer_id="cus_evt")
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "customer": "cus_evt",
                "status": "active",
                "items": {"data": [{"price": {"id": "price_pro_xyz"}}]},
            }
        },
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    refreshed = result.scalar_one()
    assert refreshed.plan == "pro"


@pytest.mark.asyncio
async def test_subscription_deleted_downgrades(db, stripe_prices):
    org = Organization(github_installation_id=4444, plan="team", stripe_customer_id="cus_del")
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"customer": "cus_del", "status": "canceled"}},
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    assert result.scalar_one().plan == "free"


@pytest.mark.asyncio
async def test_subscription_event_unknown_customer_noop(db, stripe_prices):
    event = {
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "customer": "cus_nobody",
                "status": "active",
                "items": {"data": [{"price": {"id": "price_pro_xyz"}}]},
            }
        },
    }
    # Should not raise
    await apply_subscription_event(db, event)


@pytest.mark.asyncio
async def test_unrelated_event_ignored(db):
    event = {"type": "invoice.paid", "data": {"object": {}}}
    await apply_subscription_event(db, event)  # no-op, no raise


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "stripe_status, expected_sub_status",
    [
        ("incomplete", "premium_incomplete"),
        ("incomplete_expired", "free"),
        ("unpaid", "premium_past_due"),
        ("canceled", "premium_canceled"),
        ("paused", "premium_past_due"),
        ("unknown_future_status", "free"),  # fallback to "free" for unknown values
    ],
)
async def test_subscription_updated_non_active_statuses(db, stripe_prices, stripe_status, expected_sub_status):
    """Non-active/trialing statuses downgrade plan to free with correct subscription_status."""
    from uuid import uuid4

    iid = int(uuid4().int % 10**8) + 9000
    cus = f"cus_{stripe_status[:6]}"
    org = Organization(github_installation_id=iid, plan="team", stripe_customer_id=cus)
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": cus,
                "status": stripe_status,
                "items": {"data": [{"price": {"id": "price_team_xyz"}}]},
            }
        },
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    refreshed = result.scalar_one()
    assert refreshed.plan == "free", f"status={stripe_status}: expected plan=free, got {refreshed.plan}"
    assert refreshed.subscription_status == expected_sub_status, (
        f"status={stripe_status}: expected sub_status={expected_sub_status}, got {refreshed.subscription_status}"
    )


@pytest.mark.asyncio
async def test_subscription_updated_changes_plan(db, stripe_prices):
    org = Organization(github_installation_id=5001, plan="pro", stripe_customer_id="cus_upd")
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_upd",
                "status": "active",
                "items": {"data": [{"price": {"id": "price_team_xyz"}}]},
            }
        },
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    refreshed = result.scalar_one()
    assert refreshed.plan == "team"
    assert refreshed.subscription_status == "premium_active"


@pytest.mark.asyncio
async def test_subscription_updated_past_due_keeps_plan_free(db, stripe_prices):
    """past_due status → plan reverts to free, subscription_status stays non-premium."""
    org = Organization(github_installation_id=5002, plan="pro", stripe_customer_id="cus_pastdue")
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_pastdue",
                "status": "past_due",
                "items": {"data": [{"price": {"id": "price_pro_xyz"}}]},
            }
        },
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    refreshed = result.scalar_one()
    assert refreshed.plan == "free"


@pytest.mark.asyncio
async def test_subscription_updated_trialing_sets_pro(db, stripe_prices):
    org = Organization(github_installation_id=5003, plan="free", stripe_customer_id="cus_trial")
    db.add(org)
    await db.commit()

    event = {
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "customer": "cus_trial",
                "status": "trialing",
                "items": {"data": [{"price": {"id": "price_pro_xyz"}}]},
            }
        },
    }
    await apply_subscription_event(db, event)

    result = await db.execute(select(Organization).where(Organization.id == org.id))
    refreshed = result.scalar_one()
    assert refreshed.plan == "pro"
    assert refreshed.subscription_status == "premium_active"


@pytest.fixture
async def billing_api_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with session_maker() as seed:
            org = Organization(github_installation_id=5555, plan="pro", stripe_customer_id="cus_portal")
            seed.add(org)
            await seed.commit()
            yield org.id
    finally:
        app.dependency_overrides.pop(get_db, None)
        await engine.dispose()


@pytest.mark.asyncio
async def test_portal_returns_503_when_stripe_not_configured(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "")
    org_id = billing_api_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/portal",
            json={"org_id": org_id},
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 503
    assert "STRIPE_API_KEY" in r.json()["detail"]


@pytest.mark.asyncio
async def test_portal_returns_404_for_unknown_org(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/portal",
            json={"org_id": "00000000-0000-0000-0000-000000000000"},
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_portal_creates_session(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    org_id = billing_api_db
    fake_session = MagicMock(url="https://billing.stripe.com/session/test")
    with patch("driftguard.services.billing.stripe") as mock_stripe:
        mock_stripe.billing_portal.Session.create.return_value = fake_session
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/billing/portal",
                json={"org_id": org_id},
                headers={"Authorization": "Bearer dev-only-change-me"},
            )
    assert r.status_code == 200
    assert r.json()["url"] == "https://billing.stripe.com/session/test"


# ── POST /billing/checkout ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_checkout_returns_503_when_stripe_not_configured(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_price_pro", "price_pro_xyz")
    monkeypatch.setattr(settings, "stripe_api_key", "")
    org_id = billing_api_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/checkout",
            json={"org_id": org_id, "plan": "pro"},
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 503
    assert "STRIPE_API_KEY" in r.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_returns_404_for_unknown_org(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_price_pro", "price_pro_xyz")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/checkout",
            json={"org_id": "00000000-0000-0000-0000-000000000000", "plan": "pro"},
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_checkout_returns_400_for_unknown_plan(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    org_id = billing_api_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/checkout",
            json={"org_id": org_id, "plan": "enterprise_platinum_ultra"},
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_checkout_creates_session(billing_api_db, monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_fake")
    monkeypatch.setattr(settings, "stripe_price_pro", "price_pro_xyz")
    org_id = billing_api_db
    fake_session = MagicMock(url="https://checkout.stripe.com/pay/cs_test_xyz")
    with patch("driftguard.services.billing.stripe") as mock_stripe:
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_new")
        mock_stripe.checkout.Session.create.return_value = fake_session
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/billing/checkout",
                json={"org_id": org_id, "plan": "pro", "email": "admin@example.com"},
                headers={"Authorization": "Bearer dev-only-change-me"},
            )
    assert r.status_code == 200
    assert r.json()["url"] == "https://checkout.stripe.com/pay/cs_test_xyz"


@pytest.mark.asyncio
async def test_checkout_requires_auth(billing_api_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post("/api/v1/billing/checkout", json={"org_id": "x", "plan": "pro"})
    assert r.status_code == 401


def test_stripe_configured(monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "")
    assert stripe_configured() is False
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_123")
    assert stripe_configured() is True


# ── GET /billing/plan ──────────────────────────────────────────────────────────


@pytest.fixture
async def plan_api_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield session_maker
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()


@pytest.mark.asyncio
async def test_get_plan_not_found(plan_api_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/billing/plan?installation_id=99999",
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_plan_free_org(plan_api_db):
    async with plan_api_db() as seed:
        org = Organization(github_installation_id=7001, plan="free", subscription_status="free")
        seed.add(org)
        await seed.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/billing/plan?installation_id=7001",
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "free"
    assert data["is_premium"] is False
    assert data["repos"]["active"] == 0
    assert data["repos"]["limit"] == settings.free_repository_limit
    assert data["monthly_pr_reviews"]["limit"] is None


@pytest.mark.asyncio
async def test_get_plan_premium_org(plan_api_db):
    async with plan_api_db() as seed:
        org = Organization(
            github_installation_id=7002,
            plan="pro",
            subscription_status="premium_active",
        )
        seed.add(org)
        await seed.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(
            "/api/v1/billing/plan?installation_id=7002",
            headers={"Authorization": "Bearer dev-only-change-me"},
        )
    assert r.status_code == 200
    data = r.json()
    assert data["is_premium"] is True
    assert data["repos"]["limit"] is None
    assert data["monthly_pr_reviews"]["limit"] == settings.premium_monthly_pr_limit


@pytest.mark.asyncio
async def test_get_plan_requires_auth(plan_api_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/billing/plan?installation_id=1")
    assert r.status_code == 401


# ── Downgrade auto-disable integration ───────────────────────────────────────


def _make_repo(org_id: str, enabled: bool = True) -> Repository:
    from uuid import uuid4

    return Repository(
        id=str(uuid4()),
        org_id=org_id,
        github_repo_id=int(uuid4().int % 10**9),
        full_name=f"org/repo-{uuid4().hex[:6]}",
        enabled=enabled,
    )


@pytest.mark.asyncio
async def test_downgrade_disables_excess_repos(db, stripe_prices, monkeypatch):
    """Subscription deletion triggers auto_disable_excess_repos for the downgraded org."""
    monkeypatch.setattr(settings, "free_repository_limit", 2)

    org = Organization(github_installation_id=8001, plan="team", stripe_customer_id="cus_down")
    db.add(org)
    await db.flush()

    # Add 4 enabled repos — 2 over the free limit
    for _ in range(4):
        db.add(_make_repo(org.id, enabled=True))
    await db.commit()

    event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"customer": "cus_down", "status": "canceled"}},
    }
    await apply_subscription_event(db, event)

    # Org should be downgraded
    refreshed = (await db.execute(select(Organization).where(Organization.id == org.id))).scalar_one()
    assert refreshed.plan == "free"

    # Only 2 repos should remain enabled
    active = (
        (await db.execute(select(Repository).where(Repository.org_id == org.id, Repository.enabled.is_(True))))
        .scalars()
        .all()
    )
    assert len(active) == 2


@pytest.mark.asyncio
async def test_downgrade_within_limit_leaves_repos_untouched(db, stripe_prices, monkeypatch):
    """When premium org has ≤ free_limit repos, none are disabled on downgrade."""
    monkeypatch.setattr(settings, "free_repository_limit", 3)

    org = Organization(github_installation_id=8002, plan="pro", stripe_customer_id="cus_small")
    db.add(org)
    await db.flush()

    for _ in range(2):
        db.add(_make_repo(org.id, enabled=True))
    await db.commit()

    await apply_subscription_event(
        db,
        {
            "type": "customer.subscription.deleted",
            "data": {"object": {"customer": "cus_small", "status": "canceled"}},
        },
    )

    active = (
        (await db.execute(select(Repository).where(Repository.org_id == org.id, Repository.enabled.is_(True))))
        .scalars()
        .all()
    )
    assert len(active) == 2  # unchanged


@pytest.mark.asyncio
async def test_updated_past_due_disables_excess_repos(db, stripe_prices, monkeypatch):
    """subscription.updated with past_due status → downgrade triggers auto-disable."""
    monkeypatch.setattr(settings, "free_repository_limit", 1)

    org = Organization(github_installation_id=8003, plan="team", stripe_customer_id="cus_pd")
    db.add(org)
    await db.flush()

    for _ in range(3):
        db.add(_make_repo(org.id, enabled=True))
    await db.commit()

    await apply_subscription_event(
        db,
        {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "customer": "cus_pd",
                    "status": "past_due",
                    "items": {"data": [{"price": {"id": "price_team_xyz"}}]},
                }
            },
        },
    )

    active = (
        (await db.execute(select(Repository).where(Repository.org_id == org.id, Repository.enabled.is_(True))))
        .scalars()
        .all()
    )
    assert len(active) == 1
