from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import text
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

    event_id = event["id"]
    event_type = event["type"]

    # Idempotency: Stripe retries deliveries; INSERT-first claims the event
    # atomically so concurrent duplicates can't double-process.
    claimed = await db.execute(
        text(
            "INSERT INTO processed_stripe_events (event_id, event_type) "
            "VALUES (:id, :type) ON CONFLICT (event_id) DO NOTHING "
            "RETURNING event_id"
        ),
        {"id": event_id, "type": event_type},
    )
    if claimed.scalar_one_or_none() is None:
        log.info("stripe_event_duplicate", event_id=event_id, event_type=event_type)
        return {"received": True, "duplicate": True}

    log.info("stripe_event", event_id=event_id, event_type=event_type)
    try:
        await apply_subscription_event(db, event)
    except Exception:
        # Undo uncommitted state, then defensively release a claim that may
        # already have been committed, so Stripe's retry can reprocess.
        await db.rollback()
        await db.execute(
            text("DELETE FROM processed_stripe_events WHERE event_id = :id"),
            {"id": event_id},
        )
        await db.commit()
        raise
    await db.commit()
    return {"received": True}
