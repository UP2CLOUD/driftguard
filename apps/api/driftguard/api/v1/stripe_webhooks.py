from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.services.billing import apply_subscription_event, verify_webhook

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    stripe_signature: str | None = Header(None),
):
    body = await request.body()
    if not stripe_signature:
        raise HTTPException(401, "missing signature")
    try:
        event = verify_webhook(body, stripe_signature)
    except Exception as exc:
        log.warning("stripe_webhook_invalid", error=str(exc))
        raise HTTPException(401, "invalid signature") from None

    log.info("stripe_event", event_type=event["type"])
    await apply_subscription_event(db, event)
    return {"received": True}
