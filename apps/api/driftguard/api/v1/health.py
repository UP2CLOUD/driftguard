"""Health and readiness endpoints."""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from driftguard.core.config import settings
from driftguard.core.rate_limit import rate_limit

router = APIRouter()

_started_at = time.time()


# Debug routes live on their own router, and production never mounts it
# (see api/v1/__init__.py). They are absent from the route table and from the
# OpenAPI schema in prod rather than being gated behind a token.
#
# This used to be a token check that 404'd on mismatch. That is a weaker
# property than it looks: /debug/run-migrations shells out to `alembic upgrade
# head`, and /debug/run-analyze returns a raw traceback. A route that exists is
# a route that can be reached -- by a token that leaks, by a middleware
# ordering mistake, or by a dependency that is accidentally dropped in a
# refactor. Not registering it removes all three.
debug_router = APIRouter()


def require_debug_access(x_debug_token: str | None = Header(None)) -> None:
    """Second gate, for the non-prod environments where the routes do exist.

    Staging and preview environments are not public, but they hold real-shaped
    data and are reachable by more people than prod is. Defence in depth: if
    DEBUG_ENDPOINT_TOKEN is set, it must match. Left unset, these routes stay
    open in dev, which is the point of dev.
    """
    expected = settings.debug_endpoint_token
    if expected and x_debug_token != expected:
        raise HTTPException(status_code=404, detail="Not Found")


@router.get("/health")
async def health() -> dict:
    """Liveness probe — returns 200 if the process is up."""
    return {
        "status": "ok",
        "uptime_s": round(time.time() - _started_at),
        "version": "0.1.0-beta",
    }


@router.get("/ready")
async def ready() -> Response:
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

    # Integration configuration visibility (booleans only — never degrades
    # readiness, since some deployments intentionally omit integrations)
    missing_gh = settings.missing_github_config()
    checks["github_app"] = "ok" if not missing_gh else f"not_configured: {', '.join(missing_gh)}"
    checks["stripe"] = "ok" if settings.stripe_webhook_secret else "not_configured"

    # "A key is configured" and "calls made with that key are succeeding" are
    # different facts, and only the second one is worth reporting on a status
    # page. Both Anthropic and Gemini failed in production for three weeks —
    # one on a billing error, one on a spend cap — while this check kept
    # reporting "ok" because a key was present. record_ai_outcome() is written
    # by ai/reviewer.py and services/analysis/ai_review.py on every real
    # attempt; this reads that last observation instead of pinging a provider
    # live, which would make a readiness probe slow, flaky, and billed.
    if not settings.anthropic_api_key and not settings.gemini_api_key:
        checks["ai_review"] = "not_configured"
    else:
        from driftguard.services.ai_health import get_ai_health

        ai_health = await get_ai_health()
        if ai_health is None:
            # Configured, but no PR has triggered a review since this process
            # (or Redis) last started. Not an error — just unobserved.
            checks["ai_review"] = "ok"
        elif ai_health.get("used") == "static":
            checks["ai_review"] = f"error: falling back to static summary — {ai_health.get('error', '')[:120]}"
        else:
            checks["ai_review"] = "ok"

    content = {"status": overall, "checks": checks}
    # Return 503 if any check degraded — Cloud Run traffic routing will exclude this replica
    status_code = 200 if overall == "ok" else 503
    return Response(
        content=json.dumps(content),
        media_type="application/json",
        status_code=status_code,
    )


@debug_router.get("/debug/run-analyze", dependencies=[Depends(require_debug_access)])
async def debug_run_analyze(
    installation_id: int = 137862386,
    repo: str = "UP2CLOUD/driftguard-test-iac",
    pr: int = 1,
    sha: str = "main",
) -> dict:
    """Run analyze_pr directly and return result or traceback."""
    import traceback

    try:
        from driftguard.workers.analyzer import analyze_pr

        result = await analyze_pr(
            installation_id=installation_id,
            repo_full_name=repo,
            pr_number=pr,
            head_sha=sha,
        )
        return {"status": "ok", "result": str(result)[:500]}
    except Exception:
        return {"status": "error", "traceback": traceback.format_exc()[-2000:]}


@debug_router.get("/debug/analyze-steps", dependencies=[Depends(require_debug_access)])
async def debug_analyze_steps(
    installation_id: int = 1,
    repo: str = "UP2CLOUD/driftguard-test-iac",
    pr: int = 1,
    sha: str = "main",
) -> dict:
    """Debug endpoint — runs each step of analyze_pr and reports where it fails."""
    import traceback

    steps: dict[str, str] = {}

    try:
        from driftguard.integrations.github import installation_token

        token = await installation_token(installation_id)
        # Report that a token was obtained, never any part of it. A prefix is
        # not a redaction -- it narrows a brute force and it is enough to
        # fingerprint the credential in a screenshot or a pasted log.
        steps["installation_token"] = f"OK (len={len(token)})"
    except Exception:
        steps["installation_token"] = traceback.format_exc()[-500:]
        return {"steps": steps, "failed_at": "installation_token"}

    try:
        import tempfile
        from pathlib import Path

        from driftguard.integrations.git import download_tarball

        with tempfile.TemporaryDirectory() as tmp:
            root = await download_tarball(token, repo, sha, Path(tmp))
            steps["download_tarball"] = f"OK (root={root})"
    except Exception:
        steps["download_tarball"] = traceback.format_exc()[-500:]
        return {"steps": steps, "failed_at": "download_tarball"}

    try:
        from driftguard.services.scanner.engine import scan_directory

        result = await scan_directory(root)
        steps["scan"] = f"OK ({len(result.findings)} findings)"
    except Exception:
        steps["scan"] = traceback.format_exc()[-500:]
        return {"steps": steps, "failed_at": "scan"}

    try:
        from driftguard.ai.findings import from_static_scan
        from driftguard.ai.formatter import format_comment
        from driftguard.integrations.github import post_pr_comment

        findings = from_static_scan(result.findings)
        body = format_comment(
            findings=findings,
            ai_review_md="_debug_",
            summary_meta={"sha": sha, "duration_ms": 0, "has_real_aws": False, "risk_score": 0},
        )
        await post_pr_comment(token, repo, pr, body)
        steps["post_pr_comment"] = "OK"
    except Exception:
        steps["post_pr_comment"] = traceback.format_exc()[-500:]
        return {"steps": steps, "failed_at": "post_pr_comment"}

    return {"steps": steps, "failed_at": None}


@debug_router.get("/debug/run-migrations", dependencies=[Depends(require_debug_access)])
async def debug_run_migrations() -> dict:
    """Manually trigger alembic upgrade head and return result or error."""
    import subprocess
    import sys

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        timeout=60,
    )
    return {
        "returncode": result.returncode,
        "stdout": result.stdout[-2000:],
        "stderr": result.stderr[-2000:],
    }


@debug_router.get("/debug/schema", dependencies=[Depends(require_debug_access)])
async def debug_schema() -> dict:
    """Check if migration 010 columns exist and report alembic version."""
    from sqlalchemy import text

    from driftguard.core.db import engine

    async with engine.connect() as conn:
        alembic_ver = (await conn.execute(text("SELECT version_num FROM alembic_version"))).scalar()
        col_exists = (
            await conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.columns "
                    "WHERE table_name='organizations' AND column_name='subscription_status'"
                )
            )
        ).scalar()
        org_count = (await conn.execute(text("SELECT COUNT(*) FROM organizations"))).scalar()

    return {
        "alembic_version": alembic_ver,
        "subscription_status_col_exists": bool(col_exists),
        "org_count": org_count,
    }


@router.get("/metrics", dependencies=[Depends(rate_limit(per_minute=60, per_hour=1200))])
async def metrics() -> dict:
    """Lightweight metrics for Grafana polling (no Prometheus dependency).

    Unauthenticated by design -- a scrape endpoint that needs a credential
    tends to get one hard-coded into a dashboard -- but rate limited, because
    unauthenticated and unbounded is how a health endpoint becomes an
    amplification target. 60/min is well above any sane scrape interval.

    `pid` used to be reported here. It is of no use to a dashboard and it hands
    an unauthenticated caller a process identifier, so it is gone.
    """
    import gc

    return {
        "uptime_s": round(time.time() - _started_at),
        "gc_counts": gc.get_count(),
    }
