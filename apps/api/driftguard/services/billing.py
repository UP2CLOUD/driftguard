import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.config import settings
from driftguard.core.logging import log
from driftguard.db.models import Organization


def _stripe() -> "stripe":
    stripe.api_key = settings.stripe_api_key
    return stripe


def plan_for_price(price_id: str) -> str:
    if price_id == settings.stripe_price_pro:
        return "pro"
    if price_id == settings.stripe_price_team:
        return "team"
    return "free"


def price_for_plan(plan: str) -> str | None:
    return {"pro": settings.stripe_price_pro, "team": settings.stripe_price_team}.get(plan)


async def get_or_create_customer(db: AsyncSession, org: Organization, email: str | None) -> str:
    if org.stripe_customer_id:
        return org.stripe_customer_id

    customer = _stripe().Customer.create(
        email=email,
        metadata={"org_id": org.id, "installation_id": str(org.github_installation_id)},
    )
    org.stripe_customer_id = customer.id
    await db.commit()
    log.info("stripe_customer_created", org_id=org.id, customer_id=customer.id)
    return customer.id


def create_checkout_session(*, customer_id: str, price_id: str, org_id: str) -> str:
    base = settings.public_base_url.rstrip("/")
    session = _stripe().checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{base}/dashboard?checkout=success",
        cancel_url=f"{base}/dashboard?checkout=cancelled",
        automatic_tax={"enabled": True},
        client_reference_id=org_id,
        allow_promotion_codes=True,
    )
    return session.url


def create_portal_session(*, customer_id: str) -> str:
    base = settings.public_base_url.rstrip("/")
    session = _stripe().billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{base}/dashboard",
    )
    return session.url


def verify_webhook(payload: bytes, signature: str) -> dict:
    return _stripe().Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)


async def apply_subscription_event(db: AsyncSession, event: dict) -> None:
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type not in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        return

    customer_id = data.get("customer")
    if not customer_id:
        return

    from sqlalchemy import select

    result = await db.execute(select(Organization).where(Organization.stripe_customer_id == customer_id))
    org = result.scalar_one_or_none()
    if org is None:
        log.warning("stripe_event_no_org", customer_id=customer_id, event_type=event_type)
        return

    if event_type == "customer.subscription.deleted":
        org.plan = "free"
    else:
        status = data.get("status", "")
        if status not in {"active", "trialing"}:
            org.plan = "free"
        else:
            items = data.get("items", {}).get("data", [])
            price_id = items[0]["price"]["id"] if items else ""
            org.plan = plan_for_price(price_id)

    await db.commit()
    log.info("plan_updated", org_id=org.id, plan=org.plan, event_type=event_type)
