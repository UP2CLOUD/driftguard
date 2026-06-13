from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from stripe import StripeError

from driftguard.api.deps import require_internal_auth
from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.db.models import Organization, Repository
from driftguard.services.billing import (
    create_checkout_session,
    create_portal_session,
    get_or_create_customer,
    price_for_plan,
    require_stripe_configured,
    stripe_error_message,
)
from driftguard.services.quota import get_monthly_pr_count, is_premium

router = APIRouter()


def _free_plan_defaults() -> dict:
    return {
        "plan": "free",
        "subscription_status": "free",
        "is_premium": False,
        "repos": {"active": 0, "limit": settings.free_repository_limit},
        "monthly_pr_reviews": {"used": None, "limit": None},
    }


@router.get("/plan")
async def get_plan(
    installation_id: int,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalars().first()
    if org is None:
        return _free_plan_defaults()

    active_repos = (
        await db.execute(
            select(func.count())
            .select_from(Repository)
            .where(
                Repository.org_id == org.id,
                Repository.enabled.is_(True),
            )
        )
    ).scalar_one()

    premium = is_premium(org)
    pr_count = await get_monthly_pr_count(db, org.id) if premium else None

    return {
        "plan": org.plan,
        "subscription_status": org.subscription_status,
        "is_premium": premium,
        "repos": {
            "active": active_repos,
            "limit": None if premium else settings.free_repository_limit,
        },
        "monthly_pr_reviews": {
            "used": pr_count,
            "limit": settings.premium_monthly_pr_limit if premium else None,
        },
    }


class CheckoutRequest(BaseModel):
    org_id: str
    plan: str
    email: str | None = None


@router.post("/checkout")
async def checkout(
    req: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    require_stripe_configured()
    org = await db.get(Organization, req.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")

    price_id = price_for_plan(req.plan)
    if not price_id:
        raise HTTPException(400, f"Unknown plan: {req.plan}")

    try:
        customer_id = await get_or_create_customer(db, org, req.email)
    except StripeError as exc:
        raise HTTPException(502, stripe_error_message(exc)) from exc

    url = create_checkout_session(customer_id=customer_id, price_id=price_id, org_id=org.id)
    return {"url": url}


class PortalRequest(BaseModel):
    org_id: str
    email: str | None = None


@router.post("/portal")
async def portal(
    req: PortalRequest,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    require_stripe_configured()
    org = await db.get(Organization, req.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")

    try:
        customer_id = await get_or_create_customer(db, org, req.email)
    except StripeError as exc:
        raise HTTPException(502, stripe_error_message(exc)) from exc

    url = create_portal_session(customer_id=customer_id)
    return {"url": url}
