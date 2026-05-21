from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from stripe import StripeError

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import Organization
from driftguard.services.billing import (
    create_checkout_session,
    create_portal_session,
    get_or_create_customer,
    price_for_plan,
    require_stripe_configured,
    stripe_error_message,
)

router = APIRouter()


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
