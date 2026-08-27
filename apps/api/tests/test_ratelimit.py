"""Unit tests for driftguard.core.ratelimit — token bucket + FastAPI dependency."""

from __future__ import annotations

import time
from unittest.mock import patch

import pytest
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


# ── _redis_allowed — the Redis-backed path ─────────────────────────────────────
#
# Regression coverage for the fix to N-6 in docs/PRODUCTION_READINESS.md: the
# module's own docstring claimed "Redis when available, shared across
# workers" while the implementation only ever touched the in-process bucket.
# These tests exercise the actual Redis-backed counter (via a hand-rolled
# fake, same pattern as tests/test_ai_health.py) rather than relying on the
# connection-refused fallback that test_ratelimit.py above exercises
# incidentally because no Redis server runs in this sandbox.


class _FakeRedis:
    """Minimal INCR/EXPIRE double — enough to exercise _redis_allowed's logic."""

    def __init__(self) -> None:
        self.store: dict[str, int] = {}
        self.expiries: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.store[key] = self.store.get(key, 0) + 1
        return self.store[key]

    async def expire(self, key: str, ttl: int) -> None:
        self.expiries[key] = ttl


class _BrokenRedis:
    async def incr(self, key: str) -> int:
        raise ConnectionError("redis unreachable")


class TestRedisAllowed:
    @pytest.mark.asyncio
    async def test_allows_under_both_limits(self):
        from driftguard.core.ratelimit import _redis_allowed

        with patch("driftguard.core.ratelimit._get_redis", return_value=_FakeRedis()):
            allowed = await _redis_allowed("1.2.3.4:/x", requests_per_minute=60, burst=5)
        assert allowed is True

    @pytest.mark.asyncio
    async def test_rejects_once_minute_window_exceeded(self):
        from driftguard.core.ratelimit import _redis_allowed

        fake = _FakeRedis()
        with patch("driftguard.core.ratelimit._get_redis", return_value=fake):
            for _ in range(2):
                await _redis_allowed("1.2.3.4:/x", requests_per_minute=2, burst=100)
            allowed = await _redis_allowed("1.2.3.4:/x", requests_per_minute=2, burst=100)
        assert allowed is False

    @pytest.mark.asyncio
    async def test_rejects_once_second_window_exceeded(self):
        from driftguard.core.ratelimit import _redis_allowed

        fake = _FakeRedis()
        with patch("driftguard.core.ratelimit._get_redis", return_value=fake):
            for _ in range(2):
                await _redis_allowed("1.2.3.4:/x", requests_per_minute=1000, burst=2)
            allowed = await _redis_allowed("1.2.3.4:/x", requests_per_minute=1000, burst=2)
        assert allowed is False

    @pytest.mark.asyncio
    async def test_different_keys_are_independent(self):
        from driftguard.core.ratelimit import _redis_allowed

        fake = _FakeRedis()
        with patch("driftguard.core.ratelimit._get_redis", return_value=fake):
            await _redis_allowed("1.2.3.4:/x", requests_per_minute=1, burst=1)
            # Second call, same key: minute window already at 1/1 → rejected
            same_key = await _redis_allowed("1.2.3.4:/x", requests_per_minute=1, burst=1)
            other_key = await _redis_allowed("9.9.9.9:/x", requests_per_minute=1, burst=1)
        assert same_key is False
        assert other_key is True

    @pytest.mark.asyncio
    async def test_check_falls_back_to_in_process_bucket_on_redis_error(self):
        """The FastAPI dependency must not 500 when Redis is unreachable.

        This reproduces the exact failure mode the fix addresses: before it,
        the code path being tested here (a try/except around the Redis call)
        did not exist at all, so any Redis error would propagate as a 500
        instead of degrading to the documented in-process fallback.
        """
        from driftguard.core.ratelimit import rate_limit

        app = FastAPI()

        @app.get("/broken-redis", dependencies=[rate_limit(requests_per_minute=60, burst=5)])
        async def endpoint():
            return {"ok": True}

        with patch("driftguard.core.ratelimit._get_redis", return_value=_BrokenRedis()):
            client = TestClient(app, raise_server_exceptions=False)
            r = client.get("/broken-redis")
        assert r.status_code == 200
