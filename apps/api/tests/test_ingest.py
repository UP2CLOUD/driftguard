"""Tests for POST /api/v1/ingest/event."""

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Organization
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}

_ORG = Organization(id="org-1", github_installation_id=123, plan="free")

_ORG_RESULT = MagicMock(scalar_one_or_none=MagicMock(return_value=_ORG))
_NONE_RESULT = MagicMock(scalar_one_or_none=MagicMock(return_value=None))


def _db_session():
    """Dependency override that provides a mock DB session with a registered org."""
    mock = AsyncMock()
    # First execute → org lookup (returns org); subsequent → incident/event queries (return None)
    mock.execute = AsyncMock(side_effect=[_ORG_RESULT, _NONE_RESULT, _NONE_RESULT, _NONE_RESULT])
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.add = MagicMock()
    return mock


def _make_client():
    async def _override():
        yield _db_session()

    app.dependency_overrides[get_db] = _override
    return TestClient(app)


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


def test_ingest_info_event_accepted():
    client = _make_client()
    try:
        r = client.post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 123,
                "event_type": "pr_opened",
                "severity": "info",
                "source": "github",
                "message": "PR #42 opened with 3 resource changes",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["accepted"] is True
        assert body["incident_created"] is False  # info → no incident
        assert 0 <= body["risk_score"] <= 1.0
    finally:
        _cleanup()


def test_ingest_critical_creates_incident():
    client = _make_client()
    try:
        r = client.post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 456,
                "repo_full_name": "acme/infra",
                "event_type": "policy_blocked",
                "severity": "critical",
                "source": "driftguard",
                "message": "Public access block removed from aws_s3_bucket.tf-state",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["accepted"] is True
        assert body["incident_created"] is True
        assert body["risk_score"] >= 0.8
        assert body["recommended_action"] == "block_and_review"
    finally:
        _cleanup()


def test_ingest_high_severity_review_action():
    client = _make_client()
    try:
        r = client.post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 789,
                "event_type": "security_finding",
                "severity": "high",
                "source": "checkov",
                "message": "CKV_AWS_24: Security group allows ingress from 0.0.0.0/0",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["accepted"] is True
        assert body["recommended_action"] in ("review_immediately", "escalate_policy")
    finally:
        _cleanup()


def test_ingest_missing_message_rejected():
    client = _make_client()
    try:
        r = client.post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 123,
                "event_type": "drift_detected",
                "severity": "high",
                "message": "",  # empty → Pydantic min_length=1
            },
        )
        assert r.status_code == 422
    finally:
        _cleanup()
