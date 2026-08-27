"""Rate limiter using token bucket, Redis-backed with an in-process fallback.

Until this fix, "Redis when available" was aspirational: the docstring
claimed it, but `_check()` only ever touched `_InProcBucket` — a plain
in-process dict. On a single-instance deployment that's invisible. On
Cloud Run/Render with more than one instance, each instance enforces its
own independent bucket, so the *effective* limit a client actually
experiences is `configured_limit * instance_count`, not the configured
limit — the opposite of what "shared across workers" promises, and
exactly the kind of silent gap this repo's production-readiness audit
exists to catch (see docs/PRODUCTION_READINESS.md N-6).

The Redis path below is a fixed-window counter, not a literal port of the
in-process token bucket: two independent windows per key, a 60s window
capped at `requests_per_minute` and a 1s window capped at `burst`, each
enforced via atomic `INCR` + `EXPIRE` — no Lua script needed, no read-then
-write race. This is a deliberate approximation, not the exact token-bucket
curve (a client can spend its whole per-minute quota in the first second of
a window instead of it trickling in), but it enforces the same two
configured numbers and needs no more infrastructure than what's already
running. A Redis error (down, unreachable, timeout) is caught and logged,
and the request falls through to the in-process bucket for that instance —
matching the original fallback promise, now actually implemented.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Any

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, Request, status

from driftguard.core.config import settings
from driftguard.core.logging import log


class _InProcBucket:
    """Thread-safe token bucket per key, in process memory."""

    def __init__(self) -> None:
        # {key: (tokens, last_refill_ts)}
        self._buckets: dict[str, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))

    def is_allowed(self, key: str, *, rate: float, burst: int) -> bool:
        tokens, last = self._buckets[key]
        now = time.monotonic()
        elapsed = now - last
        tokens = min(burst, tokens + elapsed * rate)
        if tokens < 1:
            self._buckets[key] = (tokens, now)
            return False
        self._buckets[key] = (tokens - 1, now)
        return True


_bucket = _InProcBucket()

_redis: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
    return _redis


async def _redis_allowed(key: str, *, requests_per_minute: int, burst: int) -> bool:
    """Atomic fixed-window check. Raises on any Redis failure — callers must catch."""
    r = _get_redis()
    now = time.time()
    minute_key = f"dg:ratelimit:{key}:m:{int(now // 60)}"
    second_key = f"dg:ratelimit:{key}:s:{int(now)}"

    minute_count = await r.incr(minute_key)
    if minute_count == 1:
        await r.expire(minute_key, 120)  # window is 60s; extra headroom against clock skew

    second_count = await r.incr(second_key)
    if second_count == 1:
        await r.expire(second_key, 2)

    return minute_count <= requests_per_minute and second_count <= burst


def rate_limit(requests_per_minute: int = 60, burst: int | None = None) -> Any:
    """FastAPI dependency — raises 429 when limit exceeded.

    Keyed by X-Forwarded-For → real IP on Cloud Run (single proxy hop).
    Falls back to host header.
    """
    _burst = burst or requests_per_minute

    async def _check(request: Request) -> None:
        ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
            if request.client
            else "unknown"
        )
        key = f"{ip}:{request.url.path}"
        try:
            allowed = await _redis_allowed(key, requests_per_minute=requests_per_minute, burst=_burst)
        except Exception as exc:  # noqa: BLE001 — Redis down must not take the endpoint down with it
            log.warning("ratelimit.redis_unavailable", error=str(exc))
            allowed = _bucket.is_allowed(key, rate=requests_per_minute / 60.0, burst=_burst)
        if not allowed:
            log.warning("rate_limited", ip=ip, path=request.url.path)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests",
                headers={"Retry-After": "10"},
            )

    return Depends(_check)


# Pre-built dependency instances
WebhookRateLimit = rate_limit(requests_per_minute=120, burst=30)
AuthRateLimit = rate_limit(requests_per_minute=20, burst=5)
ApiRateLimit = rate_limit(requests_per_minute=300, burst=60)
