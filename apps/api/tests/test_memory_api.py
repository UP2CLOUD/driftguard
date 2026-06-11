"""HTTP endpoint tests for /api/v1/memory."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import IncidentEmbedding, Organization
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=42, plan="free")


def _embedding(emb_id: str = "emb-1") -> IncidentEmbedding:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    return IncidentEmbedding(
        id=emb_id,
        org_id="org-1",
        analysis_id="ana-1",
        repo_full_name="acme/infra",
        pr_number=99,
        intent_text="Enable S3 public access for static hosting",
        severity="high",
        outcome="blocked",
        blast_radius="high",
        created_at=now,
    )


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)


def _mock_list(org=None, embeddings: list | None = None) -> AsyncMock:
    """Mock for GET /memory — two execute calls: org lookup + embeddings list."""
    mock = AsyncMock()
    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    rows_result = MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=embeddings or []))))
    mock.execute = AsyncMock(side_effect=[org_result, rows_result])
    return mock


def _mock_stats(org=None, total=0, outcome_rows=None, sev_rows=None) -> AsyncMock:
    """Mock for GET /memory/stats — four execute calls: org + count + outcome + severity."""
    mock = AsyncMock()
    org_result = MagicMock(scalar_one_or_none=MagicMock(return_value=org))
    count_result = MagicMock(scalar_one=MagicMock(return_value=total))
    outcome_result = MagicMock(all=MagicMock(return_value=outcome_rows or []))
    sev_result = MagicMock(all=MagicMock(return_value=sev_rows or []))
    mock.execute = AsyncMock(side_effect=[org_result, count_result, outcome_result, sev_result])
    return mock


# ── GET /memory ────────────────────────────────────────────────────────────────


class TestListMemory:
    def test_no_org_returns_empty(self):
        _override(_mock_list(org=None))
        try:
            r = TestClient(app).get("/api/v1/memory?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_memory_entries(self):
        emb = _embedding()
        _override(_mock_list(org=_org(), embeddings=[emb]))
        try:
            r = TestClient(app).get("/api/v1/memory?installation_id=42", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            entry = data[0]
            assert entry["id"] == "emb-1"
            assert entry["analysis_id"] == "ana-1"
            assert entry["repo_full_name"] == "acme/infra"
            assert entry["pr_number"] == 99
            assert entry["severity"] == "high"
            assert entry["outcome"] == "blocked"
            assert entry["blast_radius"] == "high"
            assert entry["created_at"] is not None
        finally:
            _cleanup()

    def test_intent_text_truncated_to_200_chars(self):
        emb = _embedding()
        emb.intent_text = "A" * 300
        _override(_mock_list(org=_org(), embeddings=[emb]))
        try:
            r = TestClient(app).get("/api/v1/memory?installation_id=42", headers=AUTH)
            assert r.status_code == 200
            assert len(r.json()[0]["intent_text"]) == 200
        finally:
            _cleanup()

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).get("/api/v1/memory", headers=AUTH)
        assert r.status_code == 422

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/memory?installation_id=42")
        assert r.status_code == 401


# ── GET /memory/stats ─────────────────────────────────────────────────────────


class TestMemoryStats:
    def test_no_org_returns_zero_stats(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/memory/stats?installation_id=9999", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["total"] == 0
            assert data["by_outcome"] == {}
            assert data["by_severity"] == {}
        finally:
            _cleanup()

    def test_returns_stats_with_data(self):
        _override(
            _mock_stats(
                org=_org(),
                total=5,
                outcome_rows=[("blocked", 3), ("approved", 2)],
                sev_rows=[("high", 3), ("medium", 2)],
            )
        )
        try:
            r = TestClient(app).get("/api/v1/memory/stats?installation_id=42", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["total"] == 5
            assert data["by_outcome"]["blocked"] == 3
            assert data["by_outcome"]["approved"] == 2
            assert data["by_severity"]["high"] == 3
            assert data["by_severity"]["medium"] == 2
        finally:
            _cleanup()

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).get("/api/v1/memory/stats", headers=AUTH)
        assert r.status_code == 422

    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/memory/stats?installation_id=42")
        assert r.status_code == 401


# ── POST /memory/recall ───────────────────────────────────────────────────────


class TestMemoryRecall:
    def test_no_org_returns_empty(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        _override(mock)
        try:
            r = TestClient(app).post(
                "/api/v1/memory/recall?installation_id=9999",
                json={"query": "public S3 bucket"},
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_missing_installation_id_returns_422(self):
        r = TestClient(app).post(
            "/api/v1/memory/recall",
            json={"query": "test"},
            headers=AUTH,
        )
        assert r.status_code == 422

    def test_requires_auth(self):
        r = TestClient(app).post(
            "/api/v1/memory/recall?installation_id=42",
            json={"query": "test"},
        )
        assert r.status_code == 401

    def test_invalid_body_returns_422(self):
        r = TestClient(app).post(
            "/api/v1/memory/recall?installation_id=42",
            json={"not_query": "oops"},
            headers=AUTH,
        )
        assert r.status_code == 422

    def test_embedding_service_failure_returns_empty(self):
        """When pgvector / embedding service is down, degrade gracefully to []."""
        from unittest.mock import patch

        org = _org()
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=org)))
        _override(mock)
        try:
            with patch(
                "driftguard.services.embeddings.embed",
                side_effect=RuntimeError("service down"),
            ):
                r = TestClient(app).post(
                    "/api/v1/memory/recall?installation_id=42",
                    json={"query": "public S3 bucket"},
                    headers=AUTH,
                )
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()
