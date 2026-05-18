from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.db.models import Base, Organization
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


def test_stripe_configured(monkeypatch):
    monkeypatch.setattr(settings, "stripe_api_key", "")
    assert stripe_configured() is False
    monkeypatch.setattr(settings, "stripe_api_key", "sk_test_123")
    assert stripe_configured() is True
