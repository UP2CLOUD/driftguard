"""LLM Router — Claude primary, OpenAI fallback.

Usage:
    from driftguard.ai.llm_router import llm_complete

    text = await llm_complete(
        system="You are a Terraform reviewer.",
        user="Review this plan...",
        max_tokens=2048,
    )
"""
from __future__ import annotations

import structlog
from anthropic import AsyncAnthropic, APIStatusError, APITimeoutError
from openai import AsyncOpenAI

from driftguard.core.config import settings

log = structlog.get_logger(__name__)

_anthropic: AsyncAnthropic | None = None
_openai: AsyncOpenAI | None = None


def _get_anthropic() -> AsyncAnthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic


def _get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai


async def llm_complete(
    *,
    system: str,
    user: str,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    tag: str = "default",
) -> str:
    """Call Claude; fall back to OpenAI on 529 / timeout if enabled."""
    try:
        client = _get_anthropic()
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        text = response.content[0].text
        log.info("llm.claude.ok", tag=tag, tokens=response.usage.output_tokens)
        _track_usage("claude", response.usage.input_tokens, response.usage.output_tokens)
        return text
    except (APIStatusError, APITimeoutError) as exc:
        log.warning("llm.claude.failed", tag=tag, error=str(exc))
        if not settings.llm_fallback_enabled or not settings.openai_api_key:
            raise
        return await _openai_fallback(system=system, user=user, max_tokens=max_tokens, tag=tag)


async def _openai_fallback(*, system: str, user: str, max_tokens: int, tag: str) -> str:
    client = _get_openai()
    response = await client.chat.completions.create(
        model=settings.openai_model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    text = response.choices[0].message.content or ""
    log.info("llm.openai.ok", tag=tag, model=settings.openai_model)
    _track_usage("openai", response.usage.prompt_tokens if response.usage else 0, response.usage.completion_tokens if response.usage else 0)
    return text


def _track_usage(provider: str, input_tokens: int, output_tokens: int) -> None:
    try:
        from driftguard.services.analytics import track
        track("llm_usage", {"provider": provider, "input_tokens": input_tokens, "output_tokens": output_tokens})
    except Exception:  # analytics is non-critical
        pass
