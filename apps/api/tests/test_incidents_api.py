"""HTTP endpoint tests for /api/v1/incidents."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import DriftIncident, Organization
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=42, plan="free")


def _incident(
    inc_id: str = "inc-1",
    status: str = "open",
    severity: str = "high",
) -> DriftIncident:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    return DriftIncident(
        id=inc_id,
        org_id="org-1",
        title="S3 public access enabled",
        description="Public read ACL on logs bucket",
        severity=severity,
        status=status,
        root_cause="Misconfigured ACL",
        suggested_fix="Set acl = private",
        recurrence_count=3,
        first_seen_at=now,
        last_seen_at=now,
    )


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


def _mock_list(org=None, incidents: list | None = None) -> AsyncMock:
    """Mock for GET /incidents (two execute calls: org lookup + incident list)."""
    mock = AsyncMock()
    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    rows_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=incidents or []))))
    mock.execute = AsyncMock(side_effect=[org_result, rows_result])
    return mock


def _mock_get(incident=None) -> AsyncMock:
    """Mock for GET/PATCH /incidents/{id} (db.get call)."""
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=incident)
    mock.commit = AsyncMock()
    return mock


# ── GET /incidents ─────────────────────────────────────────────────────────────


class TestListIncidents:
    def test_no_org_returns_empty(self):
        _override(_mock_list(org=None))
        try:
            r = TestClient(app).get("/api/v1/incidents?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_incidents_list(self):
        _override(_mock_list(org=_org(), incidents=[_incident()]))
        try:
            r = TestClient(app).get("/api/v1/incidents?installation_id=42", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert data[0]["id"] == "inc-1"
            assert data[0]["title"] == "S3 public access enabled"
            assert data[0]["status"] == "open"
            assert data[0]["severity"] == "high"
            assert data[0]["recurrence_count"] == 3
        finally:
            _cleanup()

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).get("/api/v1/incidents", headers=AUTH)
        assert r.status_code == 422

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/incidents?installation_id=42")
        assert r.status_code == 401


# ── GET /incidents/{id} ────────────────────────────────────────────────────────


class TestGetIncident:
    def test_not_found_returns_404(self):
        _override(_mock_get(incident=None))
        try:
            r = TestClient(app).get("/api/v1/incidents/nonexistent", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_returns_incident(self):
        inc = _incident()
        _override(_mock_get(incident=inc))
        try:
            r = TestClient(app).get("/api/v1/incidents/inc-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["id"] == "inc-1"
            assert data["root_cause"] == "Misconfigured ACL"
            assert data["suggested_fix"] == "Set acl = private"
        finally:
            _cleanup()


# ── PATCH /incidents/{id} ─────────────────────────────────────────────────────


class TestPatchIncident:
    def test_not_found_returns_404(self):
        _override(_mock_get(incident=None))
        try:
            r = TestClient(app).patch("/api/v1/incidents/missing", json={"status": "resolved"}, headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_update_status_to_resolved(self):
        inc = _incident(status="investigating")
        _override(_mock_get(incident=inc))
        try:
            r = TestClient(app).patch(
                "/api/v1/incidents/inc-1",
                json={"status": "resolved"},
                headers=AUTH,
            )
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "resolved"
            assert data["resolved_at"] is not None
        finally:
            _cleanup()

    def test_update_root_cause(self):
        inc = _incident()
        _override(_mock_get(incident=inc))
        try:
            r = TestClient(app).patch(
                "/api/v1/incidents/inc-1",
                json={"root_cause": "Terragrunt override"},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json()["root_cause"] == "Terragrunt override"
        finally:
            _cleanup()

    def test_invalid_status_returns_422(self):
        inc = _incident()
        _override(_mock_get(incident=inc))
        try:
            r = TestClient(app).patch(
                "/api/v1/incidents/inc-1",
                json={"status": "bogus"},
                headers=AUTH,
            )
            assert r.status_code == 422
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).patch("/api/v1/incidents/inc-1", json={"status": "resolved"})
        assert r.status_code == 401
