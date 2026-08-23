"""Tracks whether AI review is actually reaching a model, or silently degrading.

The Anthropic → Gemini → static fallback chain in `ai/reviewer.py` and
`services/analysis/ai_review.py` is designed to degrade gracefully — a PR
still gets a review even when both providers are down. That is the right
behavior for the review itself. But nothing surfaced *that it had degraded*:
both call sites only `log.warning` on failure, and `/api/v1/ready` reported
`ai_review: "ok"` as long as an API key was configured, regardless of whether
calls using it were succeeding. Both providers were failing in production for
three weeks — Anthropic on a billing error, Gemini on a spend cap — with every
PR review silently falling back to the static summary, and nothing on the
public status page reflected it.

This module is the fix: every attempt records which tier actually served the
request, so a caller can tell "degraded gracefully once" from "has been
degraded for three weeks" without adding a live provider call to the
readiness probe.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Literal

import redis.asyncio as aioredis

from driftguard.core.config import settings

log = logging.getLogger(__name__)

_KEY = "dg:ai_review:last_outcome"

Tier = Literal["anthropic", "gemini", "static"]

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


async def record_ai_outcome(*, used: Tier, error: str | None = None) -> None:
    """Record which tier served the most recent AI review attempt.

    Fire-and-forget, matching `events.publisher.publish`: this must never be
    the reason a PR review fails, so a Redis error here is logged and
    swallowed, not raised. No TTL — the point is to remember the *last*
    observed state until the next attempt overwrites it, not to have the
    signal quietly expire back to an implied "ok".
    """
    try:
        payload = json.dumps({"used": used, "error": error, "at": time.time()})
        await _get_redis().set(_KEY, payload)
    except Exception as exc:  # noqa: BLE001
        log.warning("ai_health.record_failed", extra={"error": str(exc)})


async def get_ai_health() -> dict | None:
    """Return the last recorded outcome, or None if nothing has been observed yet.

    None is a real, distinct answer — it means no PR has triggered an AI
    review since this process (or Redis) last started, not that the provider
    is healthy. Callers must not treat None as "ok".
    """
    try:
        raw = await _get_redis().get(_KEY)
    except Exception as exc:  # noqa: BLE001
        log.warning("ai_health.read_failed", extra={"error": str(exc)})
        return None
    if not raw:
        return None
    try:
        result: dict = json.loads(raw)
        return result
    except (TypeError, ValueError):
        return None
