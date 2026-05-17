from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from driftguard.core.config import settings
from driftguard.db.models import Base, Organization
from driftguard.services.billing import (
    apply_subscription_event,
    get_or_create_customer,
    plan_for_price,
    price_for_plan,
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
async def test_get_or_create_customer_creates_when_missing(db):
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
