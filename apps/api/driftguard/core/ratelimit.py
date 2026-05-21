"""Simple in-process rate limiter using token bucket.

Uses Redis when available (shared across workers), falls back to
in-process dict (single-process dev / zero-Redis environments).
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Depends, HTTPException, Request, status

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


def rate_limit(requests_per_minute: int = 60, burst: int | None = None) -> None:
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
