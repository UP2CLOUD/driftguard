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


def test_ingest_unknown_installation_returns_404():
    """Events from unregistered installations must be rejected."""
    mock = AsyncMock()
    mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.add = MagicMock()

    async def _override():
        yield mock

    app.dependency_overrides[get_db] = _override
    try:
        r = TestClient(app).post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 9999,
                "event_type": "pr_opened",
                "severity": "high",
                "message": "Injected event from unknown installation",
            },
        )
        assert r.status_code == 404
    finally:
        _cleanup()


def test_ingest_recurrence_matched_existing():
    """When a matching open incident already exists, matched_existing=True and no new incident."""
    from driftguard.db.models import DriftIncident

    org = Organization(id="org-1", github_installation_id=123, plan="free")
    existing = DriftIncident(
        id="inc-existing",
        org_id="org-1",
        title="Existing incident",
        severity="high",
        status="open",
        fingerprint="abc123",
        recurrence_count=1,
        first_seen_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        last_seen_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    mock = AsyncMock()
    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    # No repo_full_name → no repo lookup; incident dedup lookup → existing incident; policy lookup → empty
    incident_result = MagicMock(scalar_one_or_none=MagicMock(return_value=existing))
    policy_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
    mock.execute = AsyncMock(side_effect=[org_result, incident_result, policy_result])
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.add = MagicMock()

    async def _override():
        yield mock

    app.dependency_overrides[get_db] = _override
    try:
        r = TestClient(app).post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 123,
                "event_type": "drift_detected",
                "severity": "high",
                "message": "Drift detected in aws_s3_bucket.logs",
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["accepted"] is True
        assert body["incident_created"] is False
        assert body["matched_existing"] is True
        assert body["incident_id"] == "inc-existing"
        assert body["incident_recurrence"] == 2  # incremented from 1
    finally:
        _cleanup()


def test_ingest_rate_limited():
    """Rate limiter must reject requests over the per-minute limit."""
    import time

    from driftguard.core.rate_limit import _buckets

    _buckets["testclient"] = [time.monotonic()] * 31  # exceed 30/min limit
    try:
        r = TestClient(app).post(
            "/api/v1/ingest/event",
            json={
                "installation_id": 123,
                "event_type": "pr_opened",
                "severity": "info",
                "message": "rate limit test",
            },
        )
        assert r.status_code == 429
        assert "Retry-After" in r.headers
    finally:
        _buckets.pop("testclient", None)


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
