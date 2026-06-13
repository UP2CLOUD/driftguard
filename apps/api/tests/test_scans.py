"""Tests for /api/v1/scans endpoints."""

from __future__ import annotations

import io
import tarfile
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Organization
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=42, plan="free")


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


def _make_tgz(files: dict[str, str] | None = None) -> bytes:
    """Build a minimal in-memory tar.gz archive."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        for name, text in (files or {"main.tf": 'resource "aws_s3_bucket" "b" {}'}).items():
            data = text.encode()
            info = tarfile.TarInfo(name=name)
            info.size = len(data)
            tf.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def _mock_org_session(org=None) -> AsyncMock:
    mock = AsyncMock()
    mock.execute = AsyncMock(
        return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(first=MagicMock(return_value=org))))
    )
    mock.flush = AsyncMock()
    mock.commit = AsyncMock()
    mock.add = MagicMock()
    return mock


# ── POST /scans/upload ────────────────────────────────────────────────────────


class TestScanUpload:
    def test_requires_auth(self):
        r = TestClient(app).post(
            "/api/v1/scans/upload",
            data={"installation_id": "42"},
            files={"file": ("infra.tar.gz", _make_tgz(), "application/gzip")},
        )
        assert r.status_code == 401

    def test_wrong_extension_returns_400(self):
        _override(_mock_org_session(org=_org()))
        try:
            r = TestClient(app).post(
                "/api/v1/scans/upload",
                data={"installation_id": "42"},
                files={"file": ("infra.zip", b"PK", "application/zip")},
                headers=AUTH,
            )
            assert r.status_code == 400
            assert "tar.gz" in r.json()["detail"]
        finally:
            _cleanup()

    def test_no_org_returns_404(self):
        _override(_mock_org_session(org=None))
        try:
            r = TestClient(app).post(
                "/api/v1/scans/upload",
                data={"installation_id": "9999"},
                files={"file": ("infra.tar.gz", _make_tgz(), "application/gzip")},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_invalid_archive_returns_400(self):
        _override(_mock_org_session(org=_org()))
        try:
            r = TestClient(app).post(
                "/api/v1/scans/upload",
                data={"installation_id": "42"},
                files={"file": ("infra.tar.gz", b"not-a-real-tar", "application/gzip")},
                headers=AUTH,
            )
            assert r.status_code == 400
            assert "extract" in r.json()["detail"]
        finally:
            _cleanup()

    def test_upload_success_returns_scan_result(self):
        from driftguard.services.scanner.engine import ScanResult

        org = _org()
        # Three executes: org lookup + quota usage lookup + repo lookup (inside _persist_scan)
        org_result = MagicMock(scalars=MagicMock(return_value=MagicMock(first=MagicMock(return_value=org))))
        no_row_result = MagicMock(scalar_one_or_none=MagicMock(return_value=None))
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=[org_result, no_row_result, no_row_result])
        mock_session.flush = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()
        _override(mock_session)
        try:
            with (
                patch(
                    "driftguard.api.v1.scans.scan_directory",
                    new_callable=AsyncMock,
                    return_value=ScanResult(directory="/tmp/test", files_scanned=1, tf_files=1),
                ),
                patch(
                    "driftguard.api.v1.scans.run_ai_review",
                    new_callable=AsyncMock,
                    return_value=MagicMock(narrative="AI review unavailable."),
                ),
                patch(
                    "driftguard.services.policy_engine.apply_policies",
                    new_callable=AsyncMock,
                    return_value=([], "pass"),
                ),
            ):
                r = TestClient(app).post(
                    "/api/v1/scans/upload",
                    data={"installation_id": "42"},
                    files={"file": ("infra.tar.gz", _make_tgz(), "application/gzip")},
                    headers=AUTH,
                )
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "completed"
            assert data["risk_score"] == 0
            assert data["files_scanned"] == 1
            assert data["findings"] == []
        finally:
            _cleanup()


# ── POST /scans/trigger ───────────────────────────────────────────────────────


class TestScanTrigger:
    def test_requires_auth(self):
        r = TestClient(app).post(
            "/api/v1/scans/trigger",
            json={"installation_id": 42, "repo_full_name": "acme/infra"},
        )
        assert r.status_code == 401

    def test_no_org_returns_404(self):
        _override(_mock_org_session(org=None))
        try:
            r = TestClient(app).post(
                "/api/v1/scans/trigger",
                json={"installation_id": 9999, "repo_full_name": "acme/infra"},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_invalid_body_returns_422(self):
        r = TestClient(app).post(
            "/api/v1/scans/trigger",
            json={"repo_full_name": "acme/infra"},  # missing installation_id
            headers=AUTH,
        )
        assert r.status_code == 422


# ── Default-branch handling ───────────────────────────────────────────────────


class TestDefaultBranchHandling:
    def test_tarball_url_with_ref(self):
        from driftguard.integrations.github import tarball_url

        assert tarball_url("acme/infra", "develop") == "https://api.github.com/repos/acme/infra/tarball/develop"

    def test_tarball_url_without_ref_serves_default_branch(self):
        from driftguard.integrations.github import tarball_url

        # No ref → GitHub serves the repository's default branch (main, master, …)
        assert tarball_url("acme/infra") == "https://api.github.com/repos/acme/infra/tarball"
        assert tarball_url("acme/infra", None) == "https://api.github.com/repos/acme/infra/tarball"

    def test_trigger_request_ref_defaults_to_none(self):
        from driftguard.api.v1.scans import TriggerScanRequest

        req = TriggerScanRequest(installation_id=1, repo_full_name="acme/infra")
        assert req.ref is None


# ── Quota enforcement on manual scans ─────────────────────────────────────────


class TestScanQuota:
    def setup_method(self):
        from driftguard.core.rate_limit import _buckets

        _buckets.pop("testclient", None)

    def test_upload_quota_exceeded_returns_402(self):
        _override(_mock_org_session(org=_org()))
        try:
            with patch(
                "driftguard.api.v1.scans.try_consume_manual_scan_quota",
                new_callable=AsyncMock,
                return_value=False,
            ):
                r = TestClient(app).post(
                    "/api/v1/scans/upload",
                    data={"installation_id": "42"},
                    files={"file": ("infra.tar.gz", _make_tgz(), "application/gzip")},
                    headers=AUTH,
                )
            assert r.status_code == 402
            assert "limit" in r.json()["detail"].lower()
        finally:
            _cleanup()

    def test_trigger_quota_exceeded_returns_402(self):
        # trigger now makes two execute calls: org lookup then repo lookup
        org = _org()
        org_result = MagicMock(scalars=MagicMock(return_value=MagicMock(first=MagicMock(return_value=org))))
        no_repo_result = MagicMock(scalars=MagicMock(return_value=MagicMock(first=MagicMock(return_value=None))))
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=[org_result, no_repo_result])
        mock_session.flush = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()
        _override(mock_session)
        try:
            with patch(
                "driftguard.api.v1.scans.try_consume_manual_scan_quota",
                new_callable=AsyncMock,
                return_value=False,
            ):
                r = TestClient(app).post(
                    "/api/v1/scans/trigger",
                    json={"installation_id": 42, "repo_full_name": "acme/infra"},
                    headers=AUTH,
                )
            assert r.status_code == 402
        finally:
            _cleanup()

    def test_upload_quota_gate_error_fails_open(self):
        """Quota infrastructure errors must not block scans (parity with webhook path)."""
        org = _org()
        org_result = MagicMock(scalars=MagicMock(return_value=MagicMock(first=MagicMock(return_value=org))))
        no_row_result = MagicMock(scalar_one_or_none=MagicMock(return_value=None))
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(side_effect=[org_result, no_row_result, no_row_result])
        mock_session.flush = AsyncMock()
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()
        _override(mock_session)
        try:
            from driftguard.services.scanner.engine import ScanResult

            with (
                patch(
                    "driftguard.api.v1.scans.try_consume_manual_scan_quota",
                    new_callable=AsyncMock,
                    side_effect=RuntimeError("db lock timeout"),
                ),
                patch(
                    "driftguard.api.v1.scans.scan_directory",
                    new_callable=AsyncMock,
                    return_value=ScanResult(directory="/tmp/test", files_scanned=1, tf_files=1),
                ),
                patch(
                    "driftguard.api.v1.scans.run_ai_review",
                    new_callable=AsyncMock,
                    return_value=MagicMock(narrative="ok"),
                ),
            ):
                r = TestClient(app).post(
                    "/api/v1/scans/upload",
                    data={"installation_id": "42"},
                    files={"file": ("infra.tar.gz", _make_tgz(), "application/gzip")},
                    headers=AUTH,
                )
            assert r.status_code == 200
        finally:
            _cleanup()


# ── GET /scans/{analysis_id} ──────────────────────────────────────────────────


class TestGetScan:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/scans/scan-123")
        assert r.status_code == 401

    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/scans/nonexistent", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_returns_scan_result(self):
        from datetime import UTC, datetime

        analysis = Analysis(
            id="ana-1",
            pr_id="pr-1",
            status="completed",
            risk_score=42,
            files_scanned=5,
            summary_md="No critical issues.",
            started_at=datetime(2026, 1, 1, tzinfo=UTC),
        )
        mock = AsyncMock()
        ana_result = MagicMock(scalar_one_or_none=MagicMock(return_value=analysis))
        findings_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
        mock.execute = AsyncMock(side_effect=[ana_result, findings_result])
        mock.get = AsyncMock(return_value=None)  # pr and repo lookups
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/scans/ana-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["scan_id"] == "ana-1"
            assert data["status"] == "completed"
            assert data["risk_score"] == 42
            assert data["files_scanned"] == 5
            assert data["findings"] == []
            assert data["ai_summary"] == "No critical issues."
        finally:
            _cleanup()


# ── Rate limiting ─────────────────────────────────────────────────────────────


class TestScanRateLimiting:
    def _exhaust(self, limit: int) -> None:
        import time

        from driftguard.core.rate_limit import _buckets

        _buckets["testclient"] = [time.monotonic()] * limit

    def _clear(self) -> None:
        from driftguard.core.rate_limit import _buckets

        _buckets.pop("testclient", None)

    def test_upload_rate_limited(self):
        self._exhaust(6)  # exceeds 5/min
        try:
            r = TestClient(app).post(
                "/api/v1/scans/upload",
                data={"installation_id": "123"},
                files={"file": ("test.tar.gz", b"", "application/gzip")},
                headers=AUTH,
            )
            assert r.status_code == 429
            assert "Retry-After" in r.headers
        finally:
            self._clear()

    def test_trigger_rate_limited(self):
        self._exhaust(11)  # exceeds 10/min
        try:
            r = TestClient(app).post(
                "/api/v1/scans/trigger",
                json={"installation_id": 123, "repo_full_name": "acme/infra"},
                headers=AUTH,
            )
            assert r.status_code == 429
            assert "Retry-After" in r.headers
        finally:
            self._clear()
