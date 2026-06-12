"""Tests for GET /api/v1/repos, PATCH, POST enable/disable."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Organization, Repository
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _repo(repo_id: str = "repo-1", full_name: str = "acme/infra", enabled: bool = True) -> Repository:
    return Repository(
        id=repo_id,
        org_id="org-1",
        github_repo_id=42,
        full_name=full_name,
        default_branch="main",
        enabled=enabled,
    )


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


def _mock_session(repos: list | None = None, get_return=None) -> AsyncMock:
    mock = AsyncMock()
    # list_repos iterates result.scalars() directly (no .all()), so scalars() must return an iterable
    mock.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=repos or [])))
    mock.get = AsyncMock(return_value=get_return)
    mock.commit = AsyncMock()
    return mock


# ── GET /repos ────────────────────────────────────────────────────────────────


class TestListRepos:
    def test_returns_empty_when_no_repos(self):
        _override(_mock_session(repos=[]))
        try:
            r = TestClient(app).get("/api/v1/repos", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_repo_list(self):
        repos = [_repo("r1", "acme/infra"), _repo("r2", "acme/app")]
        _override(_mock_session(repos=repos))
        try:
            r = TestClient(app).get("/api/v1/repos", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 2
            assert data[0]["id"] == "r1"
            assert data[0]["full_name"] == "acme/infra"
            assert data[1]["id"] == "r2"
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/repos")
        assert r.status_code == 401


# ── PATCH /repos/{repo_id} ────────────────────────────────────────────────────


class TestPatchRepo:
    def test_not_found_returns_404(self):
        _override(_mock_session(get_return=None))
        try:
            r = TestClient(app).patch(
                "/api/v1/repos/missing-id",
                json={"enabled": False},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_disable_repo(self):
        repo = _repo(enabled=True)
        _override(_mock_session(get_return=repo))
        try:
            r = TestClient(app).patch(
                "/api/v1/repos/repo-1",
                json={"enabled": False},
                headers=AUTH,
            )
            assert r.status_code == 200
            data = r.json()
            assert data["id"] == "repo-1"
            assert data["enabled"] is False
        finally:
            _cleanup()

    def test_enable_repo_within_quota(self):
        repo = _repo(enabled=False)
        org = _free_org()
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[repo, org])
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=0)))
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/repos/repo-1",
                json={"enabled": True},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json()["enabled"] is True
        finally:
            _cleanup()

    def test_enable_repo_quota_exceeded_returns_402(self):
        repo = _repo(enabled=False)
        org = _free_org()
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[repo, org])
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=3)))
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).patch(
                "/api/v1/repos/repo-1",
                json={"enabled": True},
                headers=AUTH,
            )
            assert r.status_code == 402
        finally:
            _cleanup()

    def test_empty_patch_is_noop(self):
        repo = _repo(enabled=True)
        _override(_mock_session(get_return=repo))
        try:
            r = TestClient(app).patch(
                "/api/v1/repos/repo-1",
                json={},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json()["enabled"] is True
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).patch("/api/v1/repos/repo-1", json={"enabled": False})
        assert r.status_code == 401


def _free_org(org_id: str = "org-1") -> Organization:
    return Organization(
        id=org_id,
        github_installation_id=123,
        plan="free",
        subscription_status="free",
    )


def _premium_org(org_id: str = "org-1") -> Organization:
    return Organization(
        id=org_id,
        github_installation_id=123,
        plan="pro",
        subscription_status="premium_active",
    )


# ── POST /repos/{repo_id}/enable ──────────────────────────────────────────────


class TestEnableRepo:
    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/missing/enable", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_already_enabled_is_idempotent(self):
        repo = _repo(enabled=True)
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=repo)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/enable", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["enabled"] is True
        finally:
            _cleanup()

    def test_enable_disabled_repo_success(self):
        repo = _repo(enabled=False)
        org = _free_org()
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[repo, org])
        # assert_can_enable_repo calls db.execute(select(func.count())) → scalar_one returns 0
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=0)))
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/enable", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["enabled"] is True
        finally:
            _cleanup()

    def test_enable_premium_org_skips_quota(self):
        repo = _repo(enabled=False)
        org = _premium_org()
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[repo, org])
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/enable", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["enabled"] is True
        finally:
            _cleanup()

    def test_enable_quota_exceeded_returns_402(self):
        repo = _repo(enabled=False)
        org = _free_org()
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[repo, org])
        # 3 active repos already = at the free plan limit
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one=MagicMock(return_value=3)))
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/enable", headers=AUTH)
            assert r.status_code == 402
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).post("/api/v1/repos/repo-1/enable")
        assert r.status_code == 401


# ── POST /repos/{repo_id}/disable ────────────────────────────────────────────


class TestDisableRepo:
    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/missing/disable", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_disable_enabled_repo(self):
        repo = _repo(enabled=True)
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=repo)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/disable", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["enabled"] is False
        finally:
            _cleanup()

    def test_disable_already_disabled_repo(self):
        repo = _repo(enabled=False)
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=repo)
        mock.commit = AsyncMock()
        _override(mock)
        try:
            r = TestClient(app).post("/api/v1/repos/repo-1/disable", headers=AUTH)
            assert r.status_code == 200
            assert r.json()["enabled"] is False
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).post("/api/v1/repos/repo-1/disable")
        assert r.status_code == 401
