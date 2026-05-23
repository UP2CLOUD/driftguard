"""
Event publisher — Redis Streams + audit log persistence.

Usage:
    from driftguard.events import publish
    await publish(AnalysisCompletedEvent(...))

Events land in:
  1. Redis Stream: dg:events:{org_id}  (ephemeral, TTL 7 days)
  2. Redis PubSub: dg:pubsub:{org_id}  (WebSocket fan-out)
  3. DB audit_log                       (permanent, compliance)
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

import redis.asyncio as aioredis

from driftguard.core.config import settings

if TYPE_CHECKING:
    from driftguard.events.schemas import BaseEvent

log = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_keepalive=True,
        )
    return _redis


async def publish(event: BaseEvent, *, db=None) -> None:
    """
    Publish event to Redis Streams + optional DB audit log.
    Non-blocking: errors are logged but never raised.
    """
    try:
        payload = event.model_dump_json()
        r = _get_redis()

        stream_key = f"dg:events:{event.org_id}"
        pubsub_key = f"dg:live:{event.org_id}"

        pipe = r.pipeline()
        # Stream: capped at 10k events per org, TTL managed by consumer
        pipe.xadd(stream_key, {"data": payload}, maxlen=10_000, approximate=True)
        # PubSub: WebSocket clients subscribe to this channel
        pipe.publish(pubsub_key, payload)
        await pipe.execute()

    except Exception as exc:
        log.warning("event.publish.failed", extra={"error": str(exc), "event_type": getattr(event, "event_type", "?")})

    # Persist to audit log if db session provided
    if db is not None:
        try:
            from driftguard.db.models import AuditLog

            entry = AuditLog(
                org_id=event.org_id,
                actor=event.actor or "system",
                action=str(getattr(event, "event_type", "unknown")),
                target=event.repo_id,
                payload=json.loads(event.model_dump_json()),
            )
            db.add(entry)
            # Caller commits
        except Exception as exc:
            log.warning("event.audit.failed", extra={"error": str(exc)})


async def read_stream(
    org_id: str,
    last_id: str = "0",
    count: int = 100,
) -> list[tuple[str, dict]]:
    """Read events from org stream. Returns [(stream_id, event_dict)]."""
    r = _get_redis()
    stream_key = f"dg:events:{org_id}"
    try:
        entries = await r.xread({stream_key: last_id}, count=count)
        if not entries:
            return []
        _, messages = entries[0]
        return [(msg_id, json.loads(data["data"])) for msg_id, data in messages]
    except Exception as exc:
        log.warning("event.read.failed", extra={"error": str(exc)})
        return []
