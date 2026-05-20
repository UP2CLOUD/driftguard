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
    except Exception:
        pass
