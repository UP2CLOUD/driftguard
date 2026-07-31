"""LLM Router — Gemini primary, Claude then OpenAI fallback.

Gemini is primary to conserve Anthropic API spend; Claude and OpenAI are
tried in turn if Gemini fails.

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
from anthropic import AsyncAnthropic
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
    """Call Gemini; on failure, try Claude then OpenAI (each only if configured).

    If fallback is disabled, or no further provider is configured/succeeds,
    re-raises the *original* Gemini exception — callers should treat that as
    the canonical failure reason regardless of which fallback also failed.
    """
    try:
        return await _gemini_fallback(system=system, user=user, tag=tag)
    except Exception as gemini_exc:  # noqa: BLE001 — genai raises its own exception types
        log.warning("llm.gemini.failed", tag=tag, error=str(gemini_exc))
        if not settings.llm_fallback_enabled:
            raise

        if settings.anthropic_api_key:
            try:
                return await _claude_fallback(system=system, user=user, max_tokens=max_tokens, tag=tag)
            except Exception as claude_exc:  # noqa: BLE001 — try the next provider, not abort
                log.warning("llm.claude.failed", tag=tag, error=str(claude_exc))

        if settings.openai_api_key:
            try:
                return await _openai_fallback(system=system, user=user, max_tokens=max_tokens, tag=tag)
            except Exception as openai_exc:  # noqa: BLE001 — no providers left after this
                log.warning("llm.openai.failed", tag=tag, error=str(openai_exc))

        raise gemini_exc from None


async def _claude_fallback(*, system: str, user: str, max_tokens: int, tag: str) -> str:
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
    in_tok = response.usage.prompt_tokens if response.usage else 0
    out_tok = response.usage.completion_tokens if response.usage else 0
    _track_usage("openai", in_tok, out_tok)
    return text


async def _gemini_fallback(*, system: str, user: str, tag: str) -> str:
    import google.generativeai as genai  # lazy: avoid import cost when unused

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(model_name=settings.gemini_model, system_instruction=system)
    response = await model.generate_content_async(user)
    text = response.text or ""
    log.info("llm.gemini.ok", tag=tag, model=settings.gemini_model)
    usage = getattr(response, "usage_metadata", None)
    in_tok = getattr(usage, "prompt_token_count", 0) if usage else 0
    out_tok = getattr(usage, "candidates_token_count", 0) if usage else 0
    _track_usage("gemini", in_tok, out_tok)
    return text


def _track_usage(provider: str, input_tokens: int, output_tokens: int) -> None:
    try:
        from driftguard.services.analytics import track

        track("llm_usage", {"provider": provider, "input_tokens": input_tokens, "output_tokens": output_tokens})
    except Exception as _exc:  # noqa: BLE001 — analytics must never crash callers
        log.debug("llm.track.failed", error=str(_exc))
