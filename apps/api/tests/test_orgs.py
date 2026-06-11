"""Tests for org, incidents, and events endpoints."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Organization, PullRequest, Repository
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


# ── GET /orgs/{org_id}/analyses ───────────────────────────────────────────────


def _ana_row(
    analysis_id: str = "ana-1",
    pr_number: int = 7,
    repo_name: str = "acme/infra",
) -> tuple:
    """Return an (Analysis, PullRequest, Repository) tuple as the endpoint emits."""
    now = datetime(2026, 1, 1, tzinfo=UTC)
    a = Analysis(
        id=analysis_id,
        pr_id="pr-1",
        status="completed",
        risk_score=55,
        files_scanned=8,
        cost_delta_cents=200,
        started_at=now,
        finished_at=now,
    )
    p = PullRequest(
        id="pr-1",
        repo_id="repo-1",
        github_pr_number=pr_number,
        head_sha="abc1234abc1234abc1234abc1234abc1234abc12",
        base_sha="000000abc1234abc1234abc1234abc1234abc12",
    )
    r = Repository(
        id="repo-1",
        org_id="org-1",
        github_repo_id=99,
        full_name=repo_name,
        default_branch="main",
    )
    return (a, p, r)


class TestOrgAnalyses:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/orgs/org-1/analyses")
        assert r.status_code == 401

    def test_returns_empty_list(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/analyses", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_analyses_with_correct_shape(self):
        row = _ana_row()
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[row])))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/analyses", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            item = data[0]
            assert item["id"] == "ana-1"
            assert item["status"] == "completed"
            assert item["risk_score"] == 55
            assert item["files_scanned"] == 8
            assert item["pr_number"] == 7
            assert item["repo_full_name"] == "acme/infra"
            assert item["head_sha"] == "abc1234abc1234abc1234abc1234abc1234abc12"
            # started_at and created_at are the same value
            assert item["started_at"] == item["created_at"]
            assert item["created_at"] == "2026-01-01T00:00:00+00:00"
        finally:
            _cleanup()

    def test_limit_param_capped_at_100(self):
        """Verify the endpoint accepts limit up to 100 without error."""
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/analyses?limit=100", headers=AUTH)
            assert r.status_code == 200
        finally:
            _cleanup()


# ── GET /orgs/by-installation/{installation_id} ───────────────────────────────


def _org(org_id: str = "org-1", installation_id: int = 42) -> Organization:
    return Organization(
        id=org_id,
        github_installation_id=installation_id,
        plan="free",
        subscription_status="free",
    )


class TestGetOrgByInstallation:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/orgs/by-installation/42")
        assert r.status_code == 401

    def test_returns_org_when_found(self):
        org = _org()
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=org)))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-installation/42", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["id"] == "org-1"
            assert data["installation_id"] == 42
            assert data["plan"] == "free"
        finally:
            _cleanup()

    def test_returns_404_when_not_found_and_no_github_app(self, monkeypatch):
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "github_app_id", None)
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-installation/9999", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()


# ── PATCH /orgs/{org_id}/aws ──────────────────────────────────────────────────


class TestPatchOrgAws:
    def test_requires_auth(self):
        r = TestClient(app).patch(
            "/api/v1/orgs/org-1/aws",
            json={"aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuard"},
        )
        assert r.status_code == 401

    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/orgs/nonexistent/aws",
                json={"aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuard"},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_invalid_arn_format_returns_422(self):
        org = _org()
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/orgs/org-1/aws",
                json={"aws_role_arn": "not-an-arn"},
                headers=AUTH,
            )
            assert r.status_code == 422
        finally:
            _cleanup()

    def test_valid_arn_updates_settings(self):
        org = _org()
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/orgs/org-1/aws",
                json={"aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuard"},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "ok"
            assert r.json()["aws_role_arn"] == "arn:aws:iam::123456789012:role/DriftGuard"
        finally:
            _cleanup()

    def test_null_arn_clears_existing_setting(self):
        """Explicitly sending null removes the ARN from stored settings."""
        org = Organization(
            id="org-1",
            github_installation_id=42,
            plan="free",
            subscription_status="free",
            settings={"aws_role_arn": "arn:aws:iam::123456789012:role/Old"},
        )
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/orgs/org-1/aws",
                json={"aws_role_arn": None},
                headers=AUTH,
            )
            assert r.status_code == 200
            # Response reflects the cleared value
            assert r.json()["aws_role_arn"] is None
            # Stored settings no longer contain the ARN key
            assert "aws_role_arn" not in org.settings
        finally:
            _cleanup()

    def test_omitting_arn_field_leaves_existing_unchanged(self):
        """Not sending aws_role_arn should leave the existing ARN intact."""
        org = Organization(
            id="org-1",
            github_installation_id=42,
            plan="free",
            subscription_status="free",
            settings={"aws_role_arn": "arn:aws:iam::123456789012:role/Existing"},
        )
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/orgs/org-1/aws",
                json={"state_bucket": "my-tf-state"},
                headers=AUTH,
            )
            assert r.status_code == 200
            # ARN is preserved — returned in the response
            assert r.json()["aws_role_arn"] == "arn:aws:iam::123456789012:role/Existing"
            assert org.settings.get("aws_role_arn") == "arn:aws:iam::123456789012:role/Existing"
        finally:
            _cleanup()


# ── GET /orgs/{org_id}/repos ──────────────────────────────────────────────────


def _repo_obj(repo_id: str = "repo-1", full_name: str = "acme/infra") -> Repository:
    return Repository(
        id=repo_id,
        org_id="org-1",
        github_repo_id=42,
        full_name=full_name,
        default_branch="main",
        enabled=True,
    )


class TestListOrgRepos:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/orgs/org-1/repos")
        assert r.status_code == 401

    def test_returns_empty_list(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=[])))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/repos", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_repos_with_correct_shape(self):
        repos = [_repo_obj("r1", "acme/infra"), _repo_obj("r2", "acme/app")]
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=repos)))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/org-1/repos", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 2
            assert data[0]["id"] == "r1"
            assert data[0]["full_name"] == "acme/infra"
            assert data[0]["default_branch"] == "main"
            assert data[0]["enabled"] is True
        finally:
            _cleanup()


# ── GET /orgs/by-user ─────────────────────────────────────────────────────────


def _org_with_settings(
    org_id: str = "org-1",
    installation_id: int = 42,
    account_login: str | None = None,
    account_type: str = "User",
) -> Organization:
    settings_val = {}
    if account_login:
        settings_val["account_login"] = account_login
        settings_val["account_type"] = account_type
    return Organization(
        id=org_id,
        github_installation_id=installation_id,
        plan="free",
        subscription_status="free",
        settings=settings_val or None,
    )


class TestGetOrgsByUser:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/orgs/by-user?login=alice")
        assert r.status_code == 401

    def test_empty_login_returns_empty(self):
        mock = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_no_orgs_returns_empty(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
        )
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=alice", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_legacy_org_no_login_visible_to_any_user(self):
        """Orgs without account_login in settings match any login (legacy installs)."""
        org = _org_with_settings("org-1", 42, account_login=None)
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[org]))))
        )
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=anyone", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert data[0]["id"] == "org-1"
            assert data[0]["installation_id"] == 42
        finally:
            _cleanup()

    def test_org_type_installation_visible_to_all_users(self):
        """Organization-type installs are returned to any authenticated user."""
        org = _org_with_settings("org-1", 42, account_login="acme-corp", account_type="Organization")
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[org]))))
        )
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=random-user", headers=AUTH)
            assert r.status_code == 200
            assert len(r.json()) == 1
        finally:
            _cleanup()

    def test_user_type_only_visible_to_matching_login(self):
        """User-type installs are only returned when login matches (case-insensitive)."""
        org = _org_with_settings("org-1", 42, account_login="Alice", account_type="User")
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[org]))))
        )
        _override(mock)
        try:
            # Matching login (case-insensitive)
            r = TestClient(app).get("/api/v1/orgs/by-user?login=alice", headers=AUTH)
            assert r.status_code == 200
            assert len(r.json()) == 1

            # Non-matching login gets nothing
            r2 = TestClient(app).get("/api/v1/orgs/by-user?login=bob", headers=AUTH)
            assert r2.status_code == 200
            assert r2.json() == []
        finally:
            _cleanup()

    def test_db_exception_returns_empty(self):
        """DB errors are swallowed and return an empty list."""
        mock = AsyncMock()
        mock.execute = AsyncMock(side_effect=RuntimeError("db down"))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=alice", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_response_shape_includes_account(self):
        """Response items contain id, installation_id, and account dict."""
        org = _org_with_settings("org-1", 42, account_login="alice", account_type="User")
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[org]))))
        )
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/orgs/by-user?login=alice", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            item = data[0]
            assert item["id"] == "org-1"
            assert item["installation_id"] == 42
            assert item["account"]["login"] == "alice"
        finally:
            _cleanup()
