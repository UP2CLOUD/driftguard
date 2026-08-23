"""services/embeddings.py used to send `settings.anthropic_api_key` (a Claude
key) as the Bearer token to Voyage AI's API -- a separate provider with its
own key format. That call always failed auth, so every deployment silently
ran on the non-semantic hash-based fallback, unconditionally, with nothing
recording it. Mirrors test_ai_health.py's coverage for the same class of bug.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from driftguard.services.embedding_health import get_embedding_health, record_embedding_outcome


@pytest.mark.asyncio
async def test_record_and_read_roundtrip():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key, value):
            store[key] = value

        async def get(self, key):
            return store.get(key)

    with patch("driftguard.services.embedding_health._get_redis", return_value=FakeRedis()):
        await record_embedding_outcome(used="voyage")
        result = await get_embedding_health()

    assert result is not None
    assert result["used"] == "voyage"
    assert result["error"] is None


@pytest.mark.asyncio
async def test_record_dev_fallback_carries_the_reason():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key, value):
            store[key] = value

        async def get(self, key):
            return store.get(key)

    with patch("driftguard.services.embedding_health._get_redis", return_value=FakeRedis()):
        await record_embedding_outcome(used="dev_fallback", error="401 Unauthorized")
        result = await get_embedding_health()

    assert result["used"] == "dev_fallback"
    assert "401" in result["error"]


@pytest.mark.asyncio
async def test_no_observation_yet_returns_none_not_ok():
    class EmptyRedis:
        async def get(self, key):
            return None

    with patch("driftguard.services.embedding_health._get_redis", return_value=EmptyRedis()):
        result = await get_embedding_health()

    assert result is None


@pytest.mark.asyncio
async def test_record_never_raises_when_redis_is_down():
    class BrokenRedis:
        async def set(self, key, value):
            raise ConnectionError("redis unreachable")

    with patch("driftguard.services.embedding_health._get_redis", return_value=BrokenRedis()):
        await record_embedding_outcome(used="voyage")  # must not raise
