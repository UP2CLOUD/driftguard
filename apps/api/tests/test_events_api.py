"""HTTP endpoint tests for GET /api/v1/events."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Organization, RuntimeEvent
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=111, plan="free")


def _event(event_type: str = "drift_detected", severity: str = "warn") -> RuntimeEvent:
    return RuntimeEvent(
        id="evt-1",
        org_id="org-1",
        event_type=event_type,
        severity=severity,
        source="driftguard",
        message="Drift detected in aws_s3_bucket.logs",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


def _mock_session(org=None, events: list | None = None) -> AsyncMock:
    mock = AsyncMock()

    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    events_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=events or []))))

    mock.execute = AsyncMock(side_effect=[org_result, events_result])
    return mock


class TestListEventsNoOrg:
    def test_unknown_installation_returns_empty(self):
        _override(_mock_session(org=None))
        try:
            r = TestClient(app).get("/api/v1/events?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/events?installation_id=111")
        assert r.status_code == 401

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).get("/api/v1/events", headers=AUTH)
        assert r.status_code == 422


class TestListEventsWithOrg:
    def test_returns_events_for_valid_org(self):
        events = [_event("drift_detected", "warn"), _event("policy_blocked", "high")]
        _override(_mock_session(org=_org(), events=events))
        try:
            r = TestClient(app).get("/api/v1/events?installation_id=111", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 2
            assert data[0]["event_type"] == "drift_detected"
            assert data[0]["severity"] == "warn"
            assert data[0]["message"] == "Drift detected in aws_s3_bucket.logs"
            assert data[0]["created_at"] == "2026-01-01T00:00:00+00:00"
        finally:
            _cleanup()

    def test_returns_empty_when_no_events(self):
        _override(_mock_session(org=_org(), events=[]))
        try:
            r = TestClient(app).get("/api/v1/events?installation_id=111", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_response_shape_includes_all_fields(self):
        _override(_mock_session(org=_org(), events=[_event()]))
        try:
            r = TestClient(app).get("/api/v1/events?installation_id=111", headers=AUTH)
            item = r.json()[0]
            expected = {"id", "event_type", "severity", "source", "message", "metadata", "repo_id", "created_at"}
            assert set(item.keys()) == expected
        finally:
            _cleanup()
