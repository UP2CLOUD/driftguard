"""Tests for health, readiness and metrics endpoints."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from driftguard.main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "uptime_s" in body
    assert "version" in body


def test_ready_returns_checks():
    r = client.get("/api/v1/ready")
    # DB may or may not be reachable in test env — never crash
    assert r.status_code in (200, 503)
    body = r.json()
    assert body["status"] in ("ok", "degraded")
    assert "db" in body["checks"]


def test_ready_reports_integration_config():
    r = client.get("/api/v1/ready")
    checks = r.json()["checks"]
    assert "github_app" in checks
    assert "stripe" in checks
    assert "ai_review" in checks


class TestReadyAiReviewHealth:
    """ "ai_review": "ok" used to mean only "a key is configured" — not "calls
    with that key are succeeding". Both Anthropic and Gemini were failing in
    production for three weeks while this check kept reporting ok. These pin
    that /ready now reads the real last-observed outcome recorded by
    services/ai_health.py.
    """

    def test_no_keys_configured(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "")
        monkeypatch.setattr(settings, "gemini_api_key", "")

        r = client.get("/api/v1/ready")
        assert r.json()["checks"]["ai_review"] == "not_configured"

    def test_key_configured_but_no_review_run_yet_reports_ok(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        with patch("driftguard.services.ai_health.get_ai_health", new=AsyncMock(return_value=None)):
            r = client.get("/api/v1/ready")

        # None means "unobserved", not "known-good" -- but with no observation
        # to contradict it, an unreached feature must not read as broken.
        assert r.json()["checks"]["ai_review"] == "ok"

    def test_last_observation_was_a_real_provider(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        outcome = {"used": "anthropic", "error": None, "at": 0}
        with patch("driftguard.services.ai_health.get_ai_health", new=AsyncMock(return_value=outcome)):
            r = client.get("/api/v1/ready")

        assert r.json()["checks"]["ai_review"] == "ok"

    def test_degraded_to_static_is_reported_as_an_error(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        monkeypatch.setattr(settings, "gemini_api_key", "gm-test")
        outcome = {
            "used": "static",
            "error": "anthropic: billing error; gemini: 429 RESOURCE_EXHAUSTED",
            "at": 0,
        }
        with patch("driftguard.services.ai_health.get_ai_health", new=AsyncMock(return_value=outcome)):
            r = client.get("/api/v1/ready")

        assert r.json()["checks"]["ai_review"].startswith("error")
        assert "RESOURCE_EXHAUSTED" in r.json()["checks"]["ai_review"]

    def test_degraded_ai_review_does_not_fail_the_readiness_probe(self, monkeypatch):
        """Matches the existing design for github_app/stripe: a third-party
        integration being unhealthy must not take the pod out of rotation."""
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        outcome = {"used": "static", "error": "both providers down", "at": 0}
        with patch("driftguard.services.ai_health.get_ai_health", new=AsyncMock(return_value=outcome)):
            r = client.get("/api/v1/ready")

        if r.json()["checks"]["db"] == "ok" and r.json()["checks"]["redis"] in ("ok", "not_configured"):
            assert r.json()["status"] == "ok"
            assert r.status_code == 200


def test_ready_unconfigured_integrations_do_not_degrade(monkeypatch):
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "github_app_id", "")
    monkeypatch.setattr(settings, "github_app_private_key", "")
    monkeypatch.setattr(settings, "github_webhook_secret", "")
    monkeypatch.setattr(settings, "stripe_webhook_secret", "")

    r = client.get("/api/v1/ready")
    checks = r.json()["checks"]
    assert checks["github_app"].startswith("not_configured")
    assert "GITHUB_WEBHOOK_SECRET" in checks["github_app"]
    assert checks["stripe"] == "not_configured"
    # Missing integrations alone must not flip readiness to degraded
    if checks["db"] == "ok" and checks["redis"] in ("ok", "not_configured"):
        assert r.json()["status"] == "ok"


def test_missing_github_config_lists_unset_vars(monkeypatch):
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "github_app_id", "12345")
    monkeypatch.setattr(settings, "github_app_private_key", "")
    monkeypatch.setattr(settings, "github_webhook_secret", "s3cret")
    assert settings.missing_github_config() == ["GITHUB_APP_PRIVATE_KEY"]


def test_missing_github_config_empty_when_all_set(monkeypatch):
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "github_app_id", "12345")
    monkeypatch.setattr(settings, "github_app_private_key", "-----BEGIN RSA PRIVATE KEY-----")
    monkeypatch.setattr(settings, "github_webhook_secret", "s3cret")
    assert settings.missing_github_config() == []


def test_metrics_ok():
    r = client.get("/api/v1/metrics")
    assert r.status_code == 200
    body = r.json()
    assert "uptime_s" in body
    assert "gc_counts" in body
    # `pid` was removed: no dashboard needs it, and /metrics is unauthenticated,
    # so it handed any caller a process identifier for nothing in return.
    assert "pid" not in body
