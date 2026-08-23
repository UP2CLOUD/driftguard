"""Both configured LLM providers failed in production for three weeks with
nothing showing it: /ready reported ai_review: "ok" the entire time because a
key was configured, and every fallback to the static summary was only a
log.warning nobody was watching. These tests pin the fix — record_ai_outcome
persists what actually served the request, and /ready reads that observation
back rather than re-deriving "ok" from key presence alone.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest

from driftguard.services.ai_health import get_ai_health, record_ai_outcome


@pytest.mark.asyncio
async def test_record_and_read_roundtrip():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key, value):
            store[key] = value

        async def get(self, key):
            return store.get(key)

    with patch("driftguard.services.ai_health._get_redis", return_value=FakeRedis()):
        await record_ai_outcome(used="anthropic")
        result = await get_ai_health()

    assert result is not None
    assert result["used"] == "anthropic"
    assert result["error"] is None


@pytest.mark.asyncio
async def test_record_static_outcome_carries_the_reason():
    store: dict[str, str] = {}

    class FakeRedis:
        async def set(self, key, value):
            store[key] = value

        async def get(self, key):
            return store.get(key)

    with patch("driftguard.services.ai_health._get_redis", return_value=FakeRedis()):
        await record_ai_outcome(used="static", error="anthropic: billing error; gemini: 429 RESOURCE_EXHAUSTED")
        result = await get_ai_health()

    assert result["used"] == "static"
    assert "RESOURCE_EXHAUSTED" in result["error"]


@pytest.mark.asyncio
async def test_no_observation_yet_returns_none_not_ok():
    class EmptyRedis:
        async def get(self, key):
            return None

    with patch("driftguard.services.ai_health._get_redis", return_value=EmptyRedis()):
        result = await get_ai_health()

    # None is load-bearing: callers must not treat "nothing recorded" as "ok".
    assert result is None


@pytest.mark.asyncio
async def test_record_never_raises_when_redis_is_down():
    class BrokenRedis:
        async def set(self, key, value):
            raise ConnectionError("redis unreachable")

    with patch("driftguard.services.ai_health._get_redis", return_value=BrokenRedis()):
        await record_ai_outcome(used="anthropic")  # must not raise


@pytest.mark.asyncio
async def test_read_never_raises_when_redis_is_down():
    class BrokenRedis:
        async def get(self, key):
            raise ConnectionError("redis unreachable")

    with patch("driftguard.services.ai_health._get_redis", return_value=BrokenRedis()):
        result = await get_ai_health()

    assert result is None


@pytest.mark.asyncio
async def test_corrupt_payload_is_treated_as_no_observation():
    class GarbledRedis:
        async def get(self, key):
            return "{not valid json"

    with patch("driftguard.services.ai_health._get_redis", return_value=GarbledRedis()):
        result = await get_ai_health()

    assert result is None
