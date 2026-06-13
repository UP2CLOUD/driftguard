"""Tests for dashboard overview + ingest rate limiting."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Organization, PullRequest, Repository, RuntimeEvent
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
            # installation_id echoed back even on empty response
            assert body["installation_id"] == 9999
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/dashboard/overview?installation_id=1")
        assert r.status_code == 401

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


def _mk_scalar(v):
    return MagicMock(scalar_one=MagicMock(return_value=v))


def _mk_scalar_none(v):
    return MagicMock(scalar_one_or_none=MagicMock(return_value=v))


def _mk_rows(rows):
    """rows is a list; wraps in .all() style mock."""
    return MagicMock(all=MagicMock(return_value=rows))


def _mk_scalars(items):
    return MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=items))))


class TestDashboardOverviewPopulated:
    """Test that overview aggregates real data correctly."""

    def _build_mock_session(self, org, events, analyses):
        """Build a session mock with all execute() side effects for _build_overview."""
        mock = AsyncMock()

        now = datetime(2026, 1, 1, tzinfo=UTC)
        repo = Repository(id="r1", org_id=org.id, github_repo_id=1, full_name="acme/infra", enabled=True)
        pr = PullRequest(id="pr1", repo_id="r1", github_pr_number=7, head_sha="a" * 40, base_sha="b" * 40)
        analysis = Analysis(id="an1", pr_id="pr1", status="completed", risk_score=55, started_at=now)

        # Call order in _build_overview:
        # 1. org lookup (scalar_one_or_none → org)
        # 2. repo_count (scalar_one → 3)
        # 3. analyses_7d count (scalar_one → 2)
        # 4. avg_risk (scalar_one → 55.0)
        # 5. severity_rows (all → [("high", 2), ("critical", 1)])
        # 6. open_incidents (scalar_one → 1)
        # 7. critical_incidents (scalar_one → 1)
        # 8. memory_count (scalar_one → 5)
        # 9. recent_events (scalars → list of events)
        # 10. recent_analyses (all → list of (analysis, pr, repo) tuples)
        mock.execute = AsyncMock(
            side_effect=[
                _mk_scalar_none(org),
                _mk_scalar(3),
                _mk_scalar(2),
                _mk_scalar(55.0),
                _mk_rows([("high", 2), ("critical", 1)]),
                _mk_scalar(1),
                _mk_scalar(1),
                _mk_scalar(5),
                _mk_scalars(events),
                _mk_rows([(analysis, pr, repo)]),
            ]
        )
        mock.flush = AsyncMock()
        mock.commit = AsyncMock()
        mock.add = MagicMock()
        return mock

    def test_overview_aggregates_correctly(self):
        org = Organization(id="org-1", github_installation_id=42, plan="team")
        now = datetime(2026, 1, 1, tzinfo=UTC)
        event = RuntimeEvent(
            id="e1",
            org_id="org-1",
            event_type="drift_detected",
            severity="high",
            source="driftguard",
            message="Drift in S3 bucket",
            created_at=now,
        )

        mock = self._build_mock_session(org, [event], [])
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/dashboard/overview?installation_id=42", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["org_id"] == "org-1"
            assert data["installation_id"] == 42
            assert data["plan"] == "team"
            assert data["repos"] == 3
            assert data["analyses_7d"] == 2
            assert data["avg_risk_7d"] == 55.0
            assert data["open_incidents"] == 1
            assert data["critical_incidents"] == 1
            assert data["memory_entries"] == 5
            assert data["severity_breakdown"] == {"high": 2, "critical": 1}
            assert len(data["recent_events"]) == 1
            assert data["recent_events"][0]["event_type"] == "drift_detected"
            assert len(data["recent_analyses"]) == 1
            assert data["recent_analyses"][0]["risk_score"] == 55
        finally:
            _cleanup()

    def test_no_analyses_avg_risk_is_none(self):
        """When avg_risk query returns None (no analyses), avg_risk_7d is None."""
        org = Organization(id="org-2", github_installation_id=43, plan="free")
        mock = AsyncMock()
        mock.execute = AsyncMock(
            side_effect=[
                _mk_scalar_none(org),
                _mk_scalar(0),  # repo_count
                _mk_scalar(0),  # analyses_7d
                _mk_scalar(None),  # avg_risk → None
                _mk_rows([]),  # severity_rows
                _mk_scalar(0),  # open_incidents
                _mk_scalar(0),  # critical_incidents
                _mk_scalar(0),  # memory_count
                _mk_scalars([]),  # recent_events
                _mk_rows([]),  # recent_analyses
            ]
        )
        mock.flush = AsyncMock()
        mock.commit = AsyncMock()
        mock.add = MagicMock()
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/dashboard/overview?installation_id=43", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["avg_risk_7d"] is None
            assert data["severity_breakdown"] == {}
            assert data["recent_events"] == []
            assert data["recent_analyses"] == []
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
