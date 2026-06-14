"""Unit tests for driftguard.core.ratelimit — token bucket + FastAPI dependency."""

from __future__ import annotations

import time
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

# ── _InProcBucket ─────────────────────────────────────────────────────────────


class TestInProcBucket:
    def _bucket(self):
        from driftguard.core.ratelimit import _InProcBucket

        return _InProcBucket()

    def test_allows_first_request(self):
        b = self._bucket()
        # First call against a fresh bucket: refill from epoch 0 → full burst
        assert b.is_allowed("key1", rate=1.0, burst=5) is True

    def test_rejects_when_tokens_exhausted(self):
        b = self._bucket()
        # Drain all tokens immediately using monotonic time mock
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            # First call: refills from epoch → gets burst tokens
            b.is_allowed("key", rate=1.0, burst=3)
            # Immediately drain the rest
            b.is_allowed("key", rate=1.0, burst=3)
            b.is_allowed("key", rate=1.0, burst=3)
            # No time has passed → no refill → should be rejected
            result = b.is_allowed("key", rate=1.0, burst=3)
        assert result is False

    def test_refills_after_time_passes(self):
        b = self._bucket()
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            # Drain all burst tokens (after epoch-based initial fill)
            for _ in range(5):
                b.is_allowed("key", rate=1.0, burst=5)
            # At this point tokens should be near 0
            mock_time.monotonic.return_value = now  # still no time
            rejected = b.is_allowed("key", rate=1.0, burst=5)
            # Advance time by 3 seconds → 3 new tokens at rate=1.0
            mock_time.monotonic.return_value = now + 3.0
            allowed = b.is_allowed("key", rate=1.0, burst=5)
        assert rejected is False
        assert allowed is True

    def test_burst_cap_respected(self):
        """Tokens never accumulate beyond burst."""
        b = self._bucket()
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            # Large time gap → would give 10000 tokens but burst=3 caps it
            mock_time.monotonic.return_value = now + 10000
            # First request: should get min(3, 10000*rate) = 3
            b.is_allowed("key", rate=1.0, burst=3)
            # Verify we can only make burst more requests immediately
            mock_time.monotonic.return_value = now + 10000  # no additional time
            b.is_allowed("key", rate=1.0, burst=3)
            b.is_allowed("key", rate=1.0, burst=3)
            last = b.is_allowed("key", rate=1.0, burst=3)
        assert last is False  # out of burst

    def test_separate_keys_independent(self):
        b = self._bucket()
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            # Drain key-A completely
            for _ in range(10):
                b.is_allowed("key-A", rate=1.0, burst=3)
            # key-B is fresh and should still be allowed
            result = b.is_allowed("key-B", rate=1.0, burst=3)
        assert result is True


# ── rate_limit FastAPI dependency ─────────────────────────────────────────────


def _app_with_ratelimit(requests_per_minute: int = 60) -> FastAPI:
    from driftguard.core.ratelimit import rate_limit

    app = FastAPI()

    @app.get("/test", dependencies=[rate_limit(requests_per_minute=requests_per_minute, burst=1)])
    async def endpoint():
        return {"ok": True}

    return app


class TestRateLimitDependency:
    def test_first_request_allowed(self):
        client = TestClient(_app_with_ratelimit())
        r = client.get("/test")
        assert r.status_code == 200

    def test_second_request_rejected_when_burst_is_one(self):
        """With burst=1 and no time passing, second request must be 429."""
        app = _app_with_ratelimit(requests_per_minute=60)
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            client = TestClient(app, raise_server_exceptions=False)
            client.get("/test")
            r = client.get("/test")
        assert r.status_code == 429

    def test_429_includes_retry_after_header(self):
        app = _app_with_ratelimit(requests_per_minute=60)
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            client = TestClient(app, raise_server_exceptions=False)
            client.get("/test")
            r = client.get("/test")
        assert r.status_code == 429
        assert "Retry-After" in r.headers

    def test_different_ips_do_not_share_bucket(self):
        """Requests from different IPs have independent token buckets."""
        app = _app_with_ratelimit(requests_per_minute=60)
        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            client = TestClient(app, raise_server_exceptions=False)
            # Exhaust IP 1.2.3.4
            client.get("/test", headers={"X-Forwarded-For": "1.2.3.4"})
            client.get("/test", headers={"X-Forwarded-For": "1.2.3.4"})
            # IP 9.9.9.9 should still be allowed
            r = client.get("/test", headers={"X-Forwarded-For": "9.9.9.9"})
        assert r.status_code == 200

    def test_rate_limit_keyed_by_path(self):
        """Rate limit bucket is per (ip, path) — different paths are independent."""
        from driftguard.core.ratelimit import rate_limit

        app = FastAPI()

        @app.get("/a", dependencies=[rate_limit(requests_per_minute=60, burst=1)])
        async def a():
            return {}

        @app.get("/b", dependencies=[rate_limit(requests_per_minute=60, burst=1)])
        async def b():
            return {}

        with patch("driftguard.core.ratelimit.time") as mock_time:
            now = time.monotonic()
            mock_time.monotonic.return_value = now
            client = TestClient(app, raise_server_exceptions=False)
            # Exhaust /a
            client.get("/a")
            r_a = client.get("/a")
            # /b should still be allowed
            r_b = client.get("/b")
        assert r_a.status_code == 429
        assert r_b.status_code == 200
