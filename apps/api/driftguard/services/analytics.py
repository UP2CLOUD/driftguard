"""PostHog analytics — fire-and-forget, non-blocking."""

from __future__ import annotations

import structlog

from driftguard.core.config import settings

log = structlog.get_logger(__name__)
_client = None


def _get_client():
    global _client
    if _client is None and settings.posthog_api_key:
        import posthog

        posthog.api_key = settings.posthog_api_key
        posthog.host = settings.posthog_host
        posthog.disabled = settings.environment == "test"
        _client = posthog
    return _client


def track(event: str, properties: dict | None = None, distinct_id: str = "server") -> None:
    """Non-blocking analytics event."""
    try:
        ph = _get_client()
        if ph:
            ph.capture(distinct_id, event, properties or {})
    except Exception as exc:
        log.debug("analytics.failed", event=event, error=str(exc))


def identify(distinct_id: str, properties: dict) -> None:
    try:
        ph = _get_client()
        if ph:
            ph.identify(distinct_id, properties)
    except Exception as _exc:  # noqa: BLE001
        log.debug("analytics.identify.failed", error=str(_exc))


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.1,
        )
        log.info("sentry.initialized")
    except Exception as exc:
        log.warning("sentry.init.failed", error=str(exc))
