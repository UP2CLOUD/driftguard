"""Simple in-process rate limiter using token bucket per IP.

No Redis dependency for MVP — resets on restart.
Replace with redis-py based limiter before multi-instance prod.
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request

# {ip: [timestamps]}
_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(*, per_minute: int = 60, per_hour: int = 600):
    """FastAPI dependency factory.

    Usage:
        @router.post("/heavy")
        async def endpoint(request: Request, _=Depends(rate_limit(per_minute=10))):
            ...
    """

    async def _check(request: Request) -> None:
        ip = _ip(request)
        now = time.monotonic()

        with _lock:
            timestamps = _buckets[ip]
            # Prune old
            timestamps[:] = [t for t in timestamps if now - t < 3600]

            per_min_count = sum(1 for t in timestamps if now - t < 60)
            if per_min_count >= per_minute:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: {per_minute} req/min. Retry in 60s.",
                    headers={"Retry-After": "60"},
                )
            if len(timestamps) >= per_hour:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: {per_hour} req/hr. Retry in 3600s.",
                    headers={"Retry-After": "3600"},
                )

            timestamps.append(now)

    return _check
