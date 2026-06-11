"""Tests for dashboard overview + ingest rate limiting."""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _empty_session():
    mock = AsyncMock()
    mock.execute = AsyncMock(
        return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=None),
            scalar_one=MagicMock(return_value=0),
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
            all=MagicMock(return_value=[]),
            mappings=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
        )
    )
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.add = MagicMock()
    return mock


def _override(session):
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


AUTH = {"Authorization": "Bearer dev-only-change-me"}


class TestDashboardOverview:
    def test_unknown_installation_returns_empty(self):
        _override(_empty_session())
        try:
            r = TestClient(app).get("/api/v1/dashboard/overview?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            body = r.json()
            assert body["repos"] == 0
            assert body["analyses_7d"] == 0
            assert body["open_incidents"] == 0
            assert body["memory_entries"] == 0
            assert body["recent_events"] == []
            assert body["recent_analyses"] == []
        finally:
            _cleanup()

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).get("/api/v1/dashboard/overview", headers=AUTH)
        assert r.status_code == 422

    def test_empty_severity_breakdown(self):
        _override(_empty_session())
        try:
            r = TestClient(app).get("/api/v1/dashboard/overview?installation_id=1", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["severity_breakdown"] == {}
        finally:
            _cleanup()


class TestHealth:
    def test_health_returns_ok(self):
        r = TestClient(app).get("/api/v1/health")
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "ok"

    def test_ready_endpoint(self):
        r = TestClient(app).get("/api/v1/ready")
        # Either 200 (DB connected) or 503 (DB not reachable in test)
        assert r.status_code in (200, 503)
