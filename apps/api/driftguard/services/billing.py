import stripe
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from stripe import StripeError

from driftguard.core.config import settings
from driftguard.core.logging import log
from driftguard.db.models import Organization


def stripe_configured() -> bool:
    return bool(settings.stripe_api_key.strip())


def require_stripe_configured() -> None:
    if not stripe_configured():
        raise HTTPException(503, "Billing is not configured (missing STRIPE_API_KEY)")


def _stripe() -> "stripe":
    require_stripe_configured()
    stripe.api_key = settings.stripe_api_key
    stripe.api_version = "2026-05-27"
    return stripe


def stripe_error_message(exc: StripeError) -> str:
    user_message = getattr(exc, "user_message", None)
    if user_message:
        return str(user_message)
    return str(exc) or "Stripe request failed"


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

    try:
        customer = _stripe().Customer.create(
            email=email,
            metadata={"org_id": org.id, "installation_id": str(org.github_installation_id)},
        )
    except StripeError as exc:
        log.warning("stripe_customer_create_failed", org_id=org.id, error=str(exc))
        raise

    org.stripe_customer_id = customer.id
    await db.commit()
    log.info("stripe_customer_created", org_id=org.id, customer_id=customer.id)
    return customer.id


def create_checkout_session(
    *, customer_id: str, price_id: str, org_id: str, installation_id: str | None = None
) -> str:
    base = settings.public_base_url.rstrip("/")
    if installation_id:
        if not installation_id.isalnum():
            raise ValueError("installation_id must be alphanumeric")
        success_url = f"{base}/dashboard/{installation_id}/settings?checkout=success"
        cancel_url = f"{base}/dashboard/{installation_id}/settings?checkout=cancelled"
    else:
        success_url = f"{base}/dashboard?checkout=success"
        cancel_url = f"{base}/dashboard?checkout=cancelled"
    try:
        session = _stripe().checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            automatic_tax={"enabled": True},
            client_reference_id=org_id,
            allow_promotion_codes=True,
        )
    except StripeError as exc:
        log.warning("stripe_checkout_failed", customer_id=customer_id, error=str(exc))
        raise HTTPException(502, stripe_error_message(exc)) from exc
    if not session.url:
        raise HTTPException(502, "Stripe checkout did not return a URL")
    return session.url


def create_portal_session(*, customer_id: str) -> str:
    base = settings.public_base_url.rstrip("/")
    try:
        session = _stripe().billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{base}/dashboard",
        )
    except StripeError as exc:
        log.warning("stripe_portal_failed", customer_id=customer_id, error=str(exc))
        raise HTTPException(502, stripe_error_message(exc)) from exc
    if not session.url:
        raise HTTPException(502, "Stripe billing portal did not return a URL")
    return session.url


def verify_webhook(payload: bytes, signature: str) -> dict:
    return _stripe().Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)


_STRIPE_STATUS_TO_SUBSCRIPTION: dict[str, str] = {
    "active": "premium_active",
    "trialing": "premium_active",
    "past_due": "premium_past_due",
    "incomplete": "premium_incomplete",
    "incomplete_expired": "free",
    "unpaid": "premium_past_due",
    "canceled": "premium_canceled",
    "paused": "premium_past_due",
}


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

    was_premium = org.plan in {"pro", "team", "enterprise"} or org.subscription_status in {
        "premium_active",
        "premium_past_due",
    }

    if event_type == "customer.subscription.deleted":
        org.plan = "free"
        org.subscription_status = "free"
    else:
        status = data.get("status", "")
        org.subscription_status = _STRIPE_STATUS_TO_SUBSCRIPTION.get(status, "free")
        if status not in {"active", "trialing"}:
            org.plan = "free"
        else:
            items = data.get("items", {}).get("data", [])
            price_id = items[0]["price"]["id"] if items else ""
            org.plan = plan_for_price(price_id)
            org.subscription_status = "premium_active"

    # Auto-disable excess repos when downgrading to free.
    disabled_count = 0
    if was_premium and org.plan == "free":
        from driftguard.services.quota import auto_disable_excess_repos

        disabled_count = await auto_disable_excess_repos(db, org.id)

    await db.commit()
    log.info(
        "plan_updated",
        org_id=org.id,
        plan=org.plan,
        subscription_status=org.subscription_status,
        event_type=event_type,
        repos_disabled=disabled_count,
    )
