"""HTTP endpoint tests for GET /api/v1/analyses and GET /api/v1/analyses/{id}."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Finding, PullRequest, Repository
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _repo(repo_id: str = "repo-1") -> Repository:
    return Repository(
        id=repo_id,
        org_id="org-1",
        github_repo_id=42,
        full_name="acme/infra",
        default_branch="main",
        enabled=True,
    )


def _pr(pr_id: str = "pr-1", repo_id: str = "repo-1") -> PullRequest:
    return PullRequest(
        id=pr_id,
        repo_id=repo_id,
        github_pr_number=17,
        head_sha="abc1234def5678901234567890123456789012",
        base_sha="000000def5678901234567890123456789012",
    )


def _analysis(a_id: str = "ana-1", status: str = "completed") -> Analysis:
    return Analysis(
        id=a_id,
        pr_id="pr-1",
        status=status,
        risk_score=42,
        files_scanned=10,
        cost_delta_cents=500,
        started_at=datetime(2026, 1, 1, tzinfo=UTC),
        finished_at=datetime(2026, 1, 1, 0, 0, 5, tzinfo=UTC),
    )


def _finding(analysis_id: str = "ana-1", severity: str = "high") -> Finding:
    return Finding(
        id="find-1",
        analysis_id=analysis_id,
        type="security",
        severity=severity,
        resource_address="aws_s3_bucket.logs",
        message="Public S3 bucket",
        rule_id="S3001",
        category="storage",
        title="Public S3 bucket",
    )


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


# ── LIST /analyses ─────────────────────────────────────────────────────────────


class TestListAnalyses:
    def _mock_list(self, rows: list) -> AsyncMock:
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
        return mock

    def test_empty_returns_empty_list(self):
        _override(self._mock_list([]))
        try:
            r = TestClient(app).get("/api/v1/analyses", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_analyses_list(self):
        a = _analysis()
        p = _pr()
        repo = _repo()
        _override(self._mock_list([(a, p, repo)]))
        try:
            r = TestClient(app).get("/api/v1/analyses", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert data[0]["id"] == "ana-1"
            assert data[0]["risk_score"] == 42
            assert data[0]["pr_number"] == 17
            assert data[0]["repo_full_name"] == "acme/infra"
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/analyses")
        assert r.status_code == 401


# ── GET /analyses/{id} ─────────────────────────────────────────────────────────


class TestGetAnalysis:
    def _mock_get(self, analysis=None, pr=None, repo=None, findings=None) -> AsyncMock:
        mock = AsyncMock()
        mock.get = AsyncMock(side_effect=[analysis, pr, repo])
        mock.execute = AsyncMock(
            return_value=MagicMock(
                scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=findings or [])))
            )
        )
        return mock

    def test_not_found_returns_404(self):
        _override(self._mock_get(analysis=None))
        try:
            r = TestClient(app).get("/api/v1/analyses/nonexistent", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_returns_analysis_with_findings(self):
        a = _analysis()
        p = _pr()
        repo = _repo()
        f = _finding()
        _override(self._mock_get(analysis=a, pr=p, repo=repo, findings=[f]))
        try:
            r = TestClient(app).get("/api/v1/analyses/ana-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["id"] == "ana-1"
            assert data["status"] == "completed"
            assert data["risk_score"] == 42
            assert data["files_scanned"] == 10
            assert data["repo_full_name"] == "acme/infra"
            assert data["pr_number"] == 17
            assert data["high"] == 1
            assert data["critical"] == 0
            assert len(data["findings"]) == 1
            assert data["findings"][0]["severity"] == "high"
            assert data["findings"][0]["rule_id"] == "S3001"
            # errors defaults to [] when scan_errors is None
            assert data["errors"] == []
        finally:
            _cleanup()

    def test_scan_errors_returned_when_present(self):
        a = _analysis()
        a.scan_errors = ["AI review unavailable: timeout", "Policy engine error: DB unreachable"]
        _override(self._mock_get(analysis=a, pr=_pr(), repo=_repo()))
        try:
            r = TestClient(app).get("/api/v1/analyses/ana-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["errors"] == ["AI review unavailable: timeout", "Policy engine error: DB unreachable"]
        finally:
            _cleanup()

    def test_analysis_without_pr_returns_nulls(self):
        a = _analysis()
        _override(self._mock_get(analysis=a, pr=None, repo=None))
        try:
            r = TestClient(app).get("/api/v1/analyses/ana-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["repo_full_name"] is None
            assert data["pr_number"] is None
        finally:
            _cleanup()

    def test_duration_ms_computed_correctly(self):
        a = _analysis()
        _override(self._mock_get(analysis=a, pr=_pr(), repo=_repo()))
        try:
            r = TestClient(app).get("/api/v1/analyses/ana-1", headers=AUTH)
            data = r.json()
            assert data["duration_ms"] == 5000
        finally:
            _cleanup()

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/analyses/ana-1")
        assert r.status_code == 401
