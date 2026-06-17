"""Unit tests for driftguard.ai.llm_router — Claude primary, OpenAI fallback."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anthropic import APIStatusError, APITimeoutError


def _claude_response(text: str = "Looks good.", input_tokens: int = 100, output_tokens: int = 50):
    resp = MagicMock()
    resp.content = [MagicMock(text=text)]
    resp.usage = MagicMock(input_tokens=input_tokens, output_tokens=output_tokens)
    return resp


def _openai_response(text: str = "OpenAI fallback response."):
    choice = MagicMock()
    choice.message = MagicMock(content=text)
    resp = MagicMock()
    resp.choices = [choice]
    resp.usage = MagicMock(prompt_tokens=80, completion_tokens=40)
    return resp


# ── llm_complete ───────────────────────────────────────────────────────────────


class TestLlmComplete:
    @pytest.mark.asyncio
    async def test_successful_claude_call_returns_text(self, monkeypatch):
        """Happy path: Claude returns a successful response."""
        from driftguard.ai.llm_router import llm_complete

        fake_client = AsyncMock()
        fake_client.messages.create = AsyncMock(return_value=_claude_response("Security looks fine."))
        monkeypatch.setattr("driftguard.ai.llm_router._anthropic", fake_client)

        result = await llm_complete(system="You are a reviewer.", user="Check this plan.", tag="test")
        assert result == "Security looks fine."

    @pytest.mark.asyncio
    async def test_claude_timeout_no_fallback_reraises(self, monkeypatch):
        """When Claude times out and fallback is disabled, exception propagates."""
        from driftguard.core.config import settings

        fake_client = AsyncMock()
        fake_client.messages.create = AsyncMock(side_effect=APITimeoutError(request=MagicMock()))
        monkeypatch.setattr("driftguard.ai.llm_router._anthropic", fake_client)
        monkeypatch.setattr(settings, "llm_fallback_enabled", False)

        from driftguard.ai.llm_router import llm_complete

        with pytest.raises(APITimeoutError):
            await llm_complete(system="sys", user="usr")

    @pytest.mark.asyncio
    async def test_claude_timeout_with_fallback_calls_openai(self, monkeypatch):
        """When Claude times out and fallback is enabled, OpenAI is used."""
        from driftguard.core.config import settings

        fake_claude = AsyncMock()
        fake_claude.messages.create = AsyncMock(side_effect=APITimeoutError(request=MagicMock()))
        fake_openai = AsyncMock()
        fake_openai.chat.completions.create = AsyncMock(return_value=_openai_response("OpenAI answer."))
        monkeypatch.setattr("driftguard.ai.llm_router._anthropic", fake_claude)
        monkeypatch.setattr("driftguard.ai.llm_router._openai", fake_openai)
        monkeypatch.setattr(settings, "llm_fallback_enabled", True)
        monkeypatch.setattr(settings, "openai_api_key", "sk-test")

        from driftguard.ai.llm_router import llm_complete

        result = await llm_complete(system="sys", user="usr", tag="fallback-test")
        assert result == "OpenAI answer."

    @pytest.mark.asyncio
    async def test_claude_api_status_error_no_fallback_reraises(self, monkeypatch):
        """APIStatusError (e.g. 529 overloaded) without fallback must re-raise."""
        from driftguard.core.config import settings

        fake_client = AsyncMock()
        fake_client.messages.create = AsyncMock(
            side_effect=APIStatusError(
                "overloaded",
                response=MagicMock(status_code=529),
                body={},
            )
        )
        monkeypatch.setattr("driftguard.ai.llm_router._anthropic", fake_client)
        monkeypatch.setattr(settings, "llm_fallback_enabled", False)

        from driftguard.ai.llm_router import llm_complete

        with pytest.raises(APIStatusError):
            await llm_complete(system="sys", user="usr")

    @pytest.mark.asyncio
    async def test_claude_fallback_disabled_when_no_openai_key(self, monkeypatch):
        """Even with llm_fallback_enabled=True, missing openai_api_key means re-raise."""
        from driftguard.core.config import settings

        fake_client = AsyncMock()
        fake_client.messages.create = AsyncMock(side_effect=APITimeoutError(request=MagicMock()))
        monkeypatch.setattr("driftguard.ai.llm_router._anthropic", fake_client)
        monkeypatch.setattr(settings, "llm_fallback_enabled", True)
        monkeypatch.setattr(settings, "openai_api_key", "")

        from driftguard.ai.llm_router import llm_complete

        with pytest.raises(APITimeoutError):
            await llm_complete(system="sys", user="usr")


# ── _openai_fallback ──────────────────────────────────────────────────────────


class TestOpenAiFallback:
    @pytest.mark.asyncio
    async def test_openai_fallback_returns_response_text(self, monkeypatch):
        """_openai_fallback returns the first choice's message content."""
        fake_openai = AsyncMock()
        fake_openai.chat.completions.create = AsyncMock(return_value=_openai_response("OpenAI result."))
        monkeypatch.setattr("driftguard.ai.llm_router._openai", fake_openai)

        from driftguard.ai.llm_router import _openai_fallback

        result = await _openai_fallback(system="s", user="u", max_tokens=512, tag="t")
        assert result == "OpenAI result."

    @pytest.mark.asyncio
    async def test_openai_fallback_null_content_returns_empty_string(self, monkeypatch):
        """When OpenAI returns None content, result should be empty string."""
        resp = _openai_response(text=None)
        resp.choices[0].message.content = None

        fake_openai = AsyncMock()
        fake_openai.chat.completions.create = AsyncMock(return_value=resp)
        monkeypatch.setattr("driftguard.ai.llm_router._openai", fake_openai)

        from driftguard.ai.llm_router import _openai_fallback

        result = await _openai_fallback(system="s", user="u", max_tokens=512, tag="t")
        assert result == ""

    @pytest.mark.asyncio
    async def test_openai_fallback_no_usage_defaults_to_zero(self, monkeypatch):
        """When response.usage is None, token counts default to 0 without error."""
        resp = _openai_response("text")
        resp.usage = None

        fake_openai = AsyncMock()
        fake_openai.chat.completions.create = AsyncMock(return_value=resp)
        monkeypatch.setattr("driftguard.ai.llm_router._openai", fake_openai)

        from driftguard.ai.llm_router import _openai_fallback

        result = await _openai_fallback(system="s", user="u", max_tokens=512, tag="t")
        assert result == "text"


# ── _track_usage ──────────────────────────────────────────────────────────────


class TestTrackUsage:
    def test_track_usage_calls_analytics(self):
        """_track_usage fires analytics.track with provider and token counts."""
        from driftguard.ai.llm_router import _track_usage

        with patch("driftguard.services.analytics.track") as mock_track:
            _track_usage("claude", 100, 50)
            mock_track.assert_called_once_with(
                "llm_usage",
                {"provider": "claude", "input_tokens": 100, "output_tokens": 50},
            )

    def test_track_usage_swallows_analytics_exception(self):
        """Analytics errors must not propagate from _track_usage."""
        from driftguard.ai.llm_router import _track_usage

        with patch("driftguard.services.analytics.track", side_effect=RuntimeError("analytics down")):
            _track_usage("openai", 0, 0)  # must not raise
