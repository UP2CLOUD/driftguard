"""Tests for incidents + events endpoints."""

from datetime import UTC
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
