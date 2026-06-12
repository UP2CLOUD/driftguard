"""Tests for health, readiness and metrics endpoints."""

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
    assert "pid" in body
