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


@router.get("/debug/run-analyze")
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


@router.get("/debug/analyze-steps")
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
        steps["installation_token"] = f"OK ({token[:10]}...)"
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

        findings = from_static_scan(result)
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


@router.get("/debug/run-migrations")
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


@router.get("/debug/schema")
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
