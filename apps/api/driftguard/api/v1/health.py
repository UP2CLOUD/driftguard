"""Health and readiness endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter

router = APIRouter()

_started_at = time.time()


@router.get("/health")
async def health() -> dict:
    """Liveness probe — returns 200 if the process is up."""
    return {
        "status": "ok",
        "uptime_s": round(time.time() - _started_at),
        "version": "0.1.0-beta",
    }


@router.get("/ready")
async def ready() -> dict:
    """Readiness probe — checks DB + (optionally) Redis connectivity."""
    checks: dict[str, str] = {}
    overall = "ok"

    # DB check
    try:
        from sqlalchemy import text

        from driftguard.core.db import engine

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"error: {exc!s:.80}"
        overall = "degraded"

    # Redis check (optional — only if REDIS_URL is configured)
    try:
        from driftguard.core.config import settings

        if settings.celery_broker_url and "redis" in settings.celery_broker_url:
            import redis.asyncio as aioredis

            r = await aioredis.from_url(settings.celery_broker_url, socket_connect_timeout=2)
            await r.ping()
            await r.aclose()
            checks["redis"] = "ok"
        else:
            checks["redis"] = "not_configured"
    except ImportError:
        checks["redis"] = "not_configured"
    except Exception as exc:
        checks["redis"] = f"error: {exc!s:.80}"
        overall = "degraded"

    from fastapi import Response

    content = {"status": overall, "checks": checks}
    # Return 503 if any check degraded — Cloud Run traffic routing will exclude this replica
    status_code = 200 if overall == "ok" else 503
    return Response(
        content=__import__("json").dumps(content),
        media_type="application/json",
        status_code=status_code,
    )


@router.get("/metrics")
async def metrics() -> dict:
    """Lightweight metrics for Grafana polling (no Prometheus dependency)."""
    import gc
    import os

    return {
        "uptime_s": round(time.time() - _started_at),
        "gc_counts": gc.get_count(),
        "pid": os.getpid(),
    }
