"""Tracks whether semantic memory is producing real embeddings or the
non-semantic fallback — the same observability gap ai_health.py closed for
AI review, applied to a defect this one uncovered.

embed() calls Voyage AI when `settings.voyage_api_key` is configured, and
falls back to `_dev_embed()` (an explicitly non-semantic, hash-based
pseudo-embedding — see its docstring) on any failure. Until this module
existed, that fallback was invisible: the try/except in embed() only ever
logged a warning, so an org's "semantic recall" could silently run entirely
on _dev_embed() — meaning stored embeddings carry no real semantic
similarity, and every "similar past incident" match is closer to random —
with nothing surfacing it anywhere a human would see.

This existed before voyage_api_key did: services/embeddings.py used to send
`settings.anthropic_api_key` (a Claude key) as the Bearer token to Voyage's
API, an entirely different provider with its own key format. That call
always failed auth, so this fallback ran in every deployment, unconditionally
— not just when unconfigured.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Literal

import redis.asyncio as aioredis

from driftguard.core.config import settings

log = logging.getLogger(__name__)

_KEY = "dg:embeddings:last_outcome"

Tier = Literal["voyage", "dev_fallback"]

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


async def record_embedding_outcome(*, used: Tier, error: str | None = None) -> None:
    """Fire-and-forget, matching ai_health.record_ai_outcome — a Redis error
    here must never be the reason an incident fails to embed."""
    try:
        payload = json.dumps({"used": used, "error": error, "at": time.time()})
        await _get_redis().set(_KEY, payload)
    except Exception as exc:  # noqa: BLE001
        log.warning("embedding_health.record_failed", extra={"error": str(exc)})


async def get_embedding_health() -> dict | None:
    """None means unobserved -- no embedding has been generated yet in this
    process/Redis lifetime, not that embeddings are known-healthy."""
    try:
        raw = await _get_redis().get(_KEY)
    except Exception as exc:  # noqa: BLE001
        log.warning("embedding_health.read_failed", extra={"error": str(exc)})
        return None
    if not raw:
        return None
    try:
        result: dict = json.loads(raw)
        return result
    except (TypeError, ValueError):
        return None
