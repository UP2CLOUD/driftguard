import time

from fastapi import APIRouter
from sqlalchemy import text

from driftguard.core.db import SessionLocal
from driftguard.core.logging import log

router = APIRouter()

_start = time.time()


@router.get("/health")
async def health() -> dict:
    """Liveness — Cloud Run uses this to route traffic."""
    return {
        "status": "ok",
        "uptime_s": round(time.time() - _start),
    }


@router.get("/ready")
async def ready() -> dict:
    """Readiness — checks DB + Redis before serving traffic."""
    checks: dict[str, str] = {}
    ok = True

    # Postgres
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as exc:
        checks["db"] = f"error: {exc!s:.80}"
        ok = False
        log.error("readiness_db_fail", error=str(exc))

    # Redis (Celery broker)
    try:
        import redis.asyncio as aioredis

        from driftguard.core.config import settings

        r = aioredis.from_url(settings.celery_broker_url, socket_timeout=2)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc!s:.80}"
        # Redis unavailable degrades Celery but API still serves
        log.warning("readiness_redis_fail", error=str(exc))

    from fastapi.responses import JSONResponse

    body = {"status": "ready" if ok else "degraded", "checks": checks}
    return JSONResponse(body, status_code=200 if ok else 503)
