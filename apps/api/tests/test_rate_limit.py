"""Tests for in-process token bucket rate limiter."""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from driftguard.core.rate_limit import _buckets, rate_limit


@pytest.fixture(autouse=True)
def clear_buckets():
    _buckets.clear()
    yield
    _buckets.clear()


def _app_with_limit(per_minute: int = 3, per_hour: int = 100) -> FastAPI:
    app = FastAPI()

    @app.get(
        "/test", dependencies=[__import__("fastapi").Depends(rate_limit(per_minute=per_minute, per_hour=per_hour))]
    )
    async def endpoint():
        return {"ok": True}

    return app


def test_under_limit():
    client = TestClient(_app_with_limit())
    for _ in range(3):
        r = client.get("/test")
        assert r.status_code == 200


def test_over_per_minute_limit():
    client = TestClient(_app_with_limit(per_minute=2))
    client.get("/test")
    client.get("/test")
    r = client.get("/test")
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_retry_after_header():
    client = TestClient(_app_with_limit(per_minute=1))
    client.get("/test")
    r = client.get("/test")
    assert r.status_code == 429
    assert r.headers["Retry-After"] == "60"


def test_per_hour_limit():
    client = TestClient(_app_with_limit(per_minute=1000, per_hour=2))
    # Patch time to make all requests appear "old" for per-minute but fresh for per-hour
    with patch("driftguard.core.rate_limit.time") as mock_time:
        mock_time.monotonic.return_value = 0.0
        client.get("/test")
        client.get("/test")
        r = client.get("/test")
    assert r.status_code == 429
