from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import Organization
from driftguard.services.billing import (
    create_checkout_session,
    create_portal_session,
    get_or_create_customer,
    price_for_plan,
)

router = APIRouter()


class CheckoutRequest(BaseModel):
    org_id: str
    plan: str
    email: str | None = None


@router.post("/checkout")
async def checkout(req: CheckoutRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await db.get(Organization, req.org_id)
    if org is None:
        raise HTTPException(404, "org not found")

    price_id = price_for_plan(req.plan)
    if not price_id:
        raise HTTPException(400, f"unknown plan: {req.plan}")

    customer_id = await get_or_create_customer(db, org, req.email)
    url = create_checkout_session(customer_id=customer_id, price_id=price_id, org_id=org.id)
    return {"url": url}


class PortalRequest(BaseModel):
    org_id: str


@router.post("/portal")
async def portal(req: PortalRequest, db: AsyncSession = Depends(get_db)) -> dict:
    org = await db.get(Organization, req.org_id)
    if org is None:
        raise HTTPException(404, "org not found")
    if not org.stripe_customer_id:
        raise HTTPException(400, "no stripe customer for this org")
    url = create_portal_session(customer_id=org.stripe_customer_id)
    return {"url": url}
