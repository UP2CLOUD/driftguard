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


def test_metrics_ok():
    r = client.get("/api/v1/metrics")
    assert r.status_code == 200
    body = r.json()
    assert "uptime_s" in body
    assert "pid" in body
