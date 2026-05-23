"""
WebSocket live event stream.

Clients connect to /api/v1/ws/events/{org_id}?token=<api_token>
They receive real-time JSON events as they happen (drift, analysis, incidents).

Architecture:
  Publisher   → Redis PUBLISH dg:live:{org_id} (event JSON)
  Subscriber  → Redis SUBSCRIBE → fan-out to connected WebSocket clients
  Auth        → API token in query param (Bearer header not supported by WS)

The connection flow:
  1. Client sends WS handshake with ?token=dg_live_...
  2. Server validates token → extracts org_id
  3. Server subscribes to Redis channel for that org
  4. Server loops: Redis message → WS send
  5. On WS disconnect or Redis error → clean shutdown
"""

from __future__ import annotations

import asyncio
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from driftguard.core.config import settings
from driftguard.middleware.rbac import _resolve_api_token

log = logging.getLogger(__name__)
router = APIRouter()


class _ConnectionManager:
    """Track active WebSocket connections per org (for future multi-region extension)."""

    def __init__(self) -> None:
        self._active: dict[str, set[WebSocket]] = {}

    def register(self, org_id: str, ws: WebSocket) -> None:
        self._active.setdefault(org_id, set()).add(ws)

    def unregister(self, org_id: str, ws: WebSocket) -> None:
        if org_id in self._active:
            self._active[org_id].discard(ws)

    def count(self, org_id: str) -> int:
        return len(self._active.get(org_id, set()))


manager = _ConnectionManager()


@router.websocket("/ws/events/{org_id}")
async def live_event_stream(
    websocket: WebSocket,
    org_id: str,
) -> None:
    """
    Stream live events for an org over WebSocket.

    Authentication: ?token=dg_live_... query parameter.
    The org_id in the path is validated against the token's org_id.
    """
    # Auth via query param (WS can't send custom headers)
    token = websocket.query_params.get("token", "")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with aioredis.from_url(settings.redis_url, decode_responses=True) as _:
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker as _sm

        engine = create_async_engine(settings.database_url, echo=False)
        async_session = _sm(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as db:
            principal = await _resolve_api_token(token, db)

    if principal is None or principal.org_id != org_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    manager.register(org_id, websocket)
    log.info("ws.connected", extra={"org_id": org_id})

    channel = f"dg:live:{org_id}"
    ping_task: asyncio.Task | None = None

    try:
        async with aioredis.from_url(settings.redis_url, decode_responses=True) as r:
            pubsub = r.pubsub()
            await pubsub.subscribe(channel)

            # Keepalive ping every 30s
            async def _ping() -> None:
                while True:
                    await asyncio.sleep(30)
                    try:
                        await websocket.send_text('{"type":"ping"}')
                    except Exception:
                        break

            ping_task = asyncio.create_task(_ping())

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                data = message.get("data", "")
                if not data:
                    continue
                try:
                    await websocket.send_text(data)
                except WebSocketDisconnect:
                    break
                except Exception as exc:
                    log.warning("ws.send.failed", extra={"error": str(exc)})
                    break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        log.warning("ws.error", extra={"org_id": org_id, "error": str(exc)})
    finally:
        if ping_task:
            ping_task.cancel()
        manager.unregister(org_id, websocket)
        log.info("ws.disconnected", extra={"org_id": org_id})
        try:
            await websocket.close()
        except Exception:  # noqa: S110
            pass
