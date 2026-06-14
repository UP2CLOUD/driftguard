"""Unit tests for driftguard.services.analytics — fire-and-forget wrapper."""

from __future__ import annotations

from unittest.mock import MagicMock, patch


class TestTrack:
    def test_track_without_posthog_configured_is_noop(self, monkeypatch):
        """When posthog_api_key is not set, track() must return silently."""
        from driftguard.core.config import settings
        from driftguard.services import analytics

        monkeypatch.setattr(settings, "posthog_api_key", "")
        analytics._client = None  # reset cached client
        # Must not raise
        analytics.track("test.event", {"key": "value"})

    def test_track_with_posthog_configured_calls_capture(self, monkeypatch):
        """When posthog is configured, capture() should be called."""
        from driftguard.core.config import settings
        from driftguard.services import analytics

        fake_ph = MagicMock()
        monkeypatch.setattr(settings, "posthog_api_key", "phc_test")
        analytics._client = fake_ph

        analytics.track("org.created", {"plan": "free"})

        fake_ph.capture.assert_called_once_with("server", "org.created", {"plan": "free"})
        analytics._client = None

    def test_track_with_custom_distinct_id(self, monkeypatch):
        """distinct_id parameter must be forwarded to capture()."""
        from driftguard.services import analytics

        fake_ph = MagicMock()
        analytics._client = fake_ph

        analytics.track("login", distinct_id="user-123")

        call_args = fake_ph.capture.call_args
        assert call_args[0][0] == "user-123"
        analytics._client = None

    def test_track_swallows_posthog_exception(self, monkeypatch):
        """Errors in PostHog must not propagate to callers."""
        from driftguard.services import analytics

        fake_ph = MagicMock()
        fake_ph.capture.side_effect = RuntimeError("posthog down")
        analytics._client = fake_ph

        analytics.track("analysis.completed")  # must not raise
        analytics._client = None

    def test_track_default_properties_is_empty_dict(self, monkeypatch):
        """track() with no properties passes {} to capture."""
        from driftguard.services import analytics

        fake_ph = MagicMock()
        analytics._client = fake_ph

        analytics.track("repo.added")

        call_args = fake_ph.capture.call_args
        assert call_args[0][2] == {}
        analytics._client = None


class TestIdentify:
    def test_identify_without_posthog_is_noop(self, monkeypatch):
        """When posthog is not configured, identify() must return silently."""
        from driftguard.core.config import settings
        from driftguard.services import analytics

        monkeypatch.setattr(settings, "posthog_api_key", "")
        analytics._client = None
        analytics.identify("org-1", {"plan": "free"})  # must not raise

    def test_identify_calls_posthog_identify(self, monkeypatch):
        """identify() forwards distinct_id and properties to posthog.identify()."""
        from driftguard.services import analytics

        fake_ph = MagicMock()
        analytics._client = fake_ph

        analytics.identify("org-xyz", {"plan": "team", "repos": 5})

        fake_ph.identify.assert_called_once_with("org-xyz", {"plan": "team", "repos": 5})
        analytics._client = None

    def test_identify_swallows_exception(self, monkeypatch):
        """Errors in identify() must not propagate."""
        from driftguard.services import analytics

        fake_ph = MagicMock()
        fake_ph.identify.side_effect = ConnectionError("network error")
        analytics._client = fake_ph

        analytics.identify("org-1", {})  # must not raise
        analytics._client = None


class TestInitSentry:
    def test_init_sentry_skipped_when_no_dsn(self, monkeypatch):
        """init_sentry() must be a no-op when sentry_dsn is empty."""
        from driftguard.core.config import settings
        from driftguard.services.analytics import init_sentry

        monkeypatch.setattr(settings, "sentry_dsn", "")
        with patch("sentry_sdk.init") as mock_init:
            init_sentry()
            mock_init.assert_not_called()

    def test_init_sentry_swallows_sentry_init_error(self, monkeypatch):
        """If sentry_sdk.init() raises, init_sentry must not crash."""
        import sentry_sdk

        from driftguard.core.config import settings
        from driftguard.services.analytics import init_sentry

        monkeypatch.setattr(settings, "sentry_dsn", "https://key@sentry.io/123")
        with patch.object(sentry_sdk, "init", side_effect=RuntimeError("bad dsn")):
            init_sentry()  # must not raise
