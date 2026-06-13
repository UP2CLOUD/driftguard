"""Tests for in-process token bucket rate limiter."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from driftguard.core.rate_limit import _buckets, _ip, rate_limit


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


def test_per_hour_retry_after_header():
    client = TestClient(_app_with_limit(per_minute=1000, per_hour=1))
    with patch("driftguard.core.rate_limit.time") as mock_time:
        mock_time.monotonic.return_value = 0.0
        client.get("/test")
        r = client.get("/test")
    assert r.headers.get("Retry-After") == "3600"


def test_different_ips_have_separate_buckets():
    """Requests from different IPs don't share rate limit buckets."""
    client = TestClient(_app_with_limit(per_minute=1))
    # First IP hits limit
    client.get("/test", headers={"X-Forwarded-For": "1.2.3.4"})
    r = client.get("/test", headers={"X-Forwarded-For": "1.2.3.4"})
    assert r.status_code == 429
    # Second IP still allowed
    r2 = client.get("/test", headers={"X-Forwarded-For": "9.9.9.9"})
    assert r2.status_code == 200


# ── _ip() ─────────────────────────────────────────────────────────────────────


def _mock_request(forwarded: str | None = None, client_host: str = "10.0.0.1"):
    req = MagicMock()
    req.headers = {"x-forwarded-for": forwarded} if forwarded else {}
    req.client = MagicMock()
    req.client.host = client_host
    return req


def test_ip_uses_forwarded_for():
    req = _mock_request(forwarded="203.0.113.1")
    assert _ip(req) == "203.0.113.1"


def test_ip_strips_whitespace_from_forwarded():
    req = _mock_request(forwarded="  203.0.113.1  ")
    assert _ip(req) == "203.0.113.1"


def test_ip_takes_first_from_proxy_chain():
    req = _mock_request(forwarded="203.0.113.1, 10.0.0.1, 172.16.0.1")
    assert _ip(req) == "203.0.113.1"


def test_ip_falls_back_to_client_host():
    req = _mock_request(forwarded=None, client_host="192.168.1.100")
    assert _ip(req) == "192.168.1.100"


def test_ip_no_client_returns_unknown():
    req = MagicMock()
    req.headers = {}
    req.client = None
    assert _ip(req) == "unknown"
