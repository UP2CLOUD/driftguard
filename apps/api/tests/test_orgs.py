"""Tests for org, incidents, and events endpoints."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _no_org_session():
    mock = AsyncMock()
    mock.execute = AsyncMock(
        return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=None),
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))),
        )
    )
    mock.get = AsyncMock(return_value=None)
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


def test_list_incidents_no_org_returns_empty():
    _override(_no_org_session())
    try:
        r = TestClient(app).get("/api/v1/incidents?installation_id=9999", headers=AUTH)
        assert r.status_code == 200
        assert r.json() == []
    finally:
        _cleanup()


def test_get_incident_not_found():
    _override(_no_org_session())
    try:
        r = TestClient(app).get("/api/v1/incidents/nonexistent-id", headers=AUTH)
        assert r.status_code == 404
    finally:
        _cleanup()


def test_patch_incident_not_found():
    _override(_no_org_session())
    try:
        r = TestClient(app).patch(
            "/api/v1/incidents/nonexistent-id",
            json={"status": "resolved"},
            headers=AUTH,
        )
        assert r.status_code == 404
    finally:
        _cleanup()


def test_list_events_no_org_returns_empty():
    _override(_no_org_session())
    try:
        r = TestClient(app).get("/api/v1/events?installation_id=9999", headers=AUTH)
        assert r.status_code == 200
        assert r.json() == []
    finally:
        _cleanup()


def _audit_row(
    row_id: str = "audit-1",
    actor: str = "user@example.com",
    action: str = "analysis_complete",
):
    row = MagicMock()
    row.id = row_id
    row.actor = actor
    row.action = action
    row.target = "acme/infra"
    row.payload = {"risk_score": 42}
    row.created_at = datetime(2026, 1, 1, tzinfo=UTC)
    return row


class TestAuditLog:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/orgs/org-1/audit-log")
        assert r.status_code == 401

    def test_returns_empty_list(self):
        mock = AsyncMock()
        result = MagicMock()
        result.fetchall.return_value = []
        mock.execute = AsyncMock(return_value=result)
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/audit-log", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_entries(self):
        mock = AsyncMock()
        result = MagicMock()
        result.fetchall.return_value = [_audit_row("a1", "alice", "analysis_complete")]
        mock.execute = AsyncMock(return_value=result)
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/audit-log?limit=10", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert data[0]["id"] == "a1"
            assert data[0]["actor"] == "alice"
            assert data[0]["action"] == "analysis_complete"
            assert data[0]["target"] == "acme/infra"
            assert data[0]["created_at"] == "2026-01-01T00:00:00+00:00"
        finally:
            _cleanup()


def test_patch_incident_invalid_status():
    from datetime import datetime

    from driftguard.db.models import DriftIncident

    inc = DriftIncident(
        id="test-id",
        org_id="org-1",
        title="Test incident",
        severity="high",
        status="open",
        recurrence_count=1,
        first_seen_at=datetime.now(UTC),
        last_seen_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock = AsyncMock()
    mock.get = AsyncMock(return_value=inc)
    mock.commit = AsyncMock()
    _override(mock)
    try:
        r = TestClient(app).patch(
            "/api/v1/incidents/test-id",
            json={"status": "invalid_status"},
            headers=AUTH,
        )
        assert r.status_code == 422
    finally:
        _cleanup()
