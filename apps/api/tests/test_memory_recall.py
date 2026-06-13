"""Unit tests for driftguard.services.memory_recall."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from driftguard.ai.findings import Finding
from driftguard.db.models import IncidentEmbedding, Organization
from driftguard.services.memory_recall import (
    format_recall_section,
    recall_similar,
    store_memory,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _finding(severity: str = "high", resource: str = "aws_s3_bucket.logs") -> Finding:
    return Finding(
        type="security",
        severity=severity,
        resource=resource,
        message="S3 bucket publicly accessible",
    )


def _org() -> Organization:
    return Organization(id="org-1", github_installation_id=42, plan="free")


def _embedding(repo: str = "acme/infra", pr: int = 7) -> IncidentEmbedding:
    return IncidentEmbedding(
        id="emb-1",
        org_id="org-1",
        analysis_id="ana-1",
        repo_full_name=repo,
        pr_number=pr,
        intent_text="S3 bucket is publicly accessible",
        severity="high",
        outcome="blocked",
        blast_radius="high",
    )


# ── format_recall_section ─────────────────────────────────────────────────────


class TestFormatRecallSection:
    def test_empty_list_returns_empty_string(self):
        assert format_recall_section([]) == ""

    def test_single_blocked_recall(self):
        recalls = [
            {
                "repo": "acme/infra",
                "pr": 42,
                "similarity": 0.91,
                "outcome": "blocked",
                "severity": "high",
                "summary": "Public S3 bucket detected",
            }
        ]
        output = format_recall_section(recalls)
        assert "acme/infra#42" in output
        assert "91%" in output
        assert "🔴" in output
        assert "Public S3 bucket detected" in output
        assert "<details>" in output

    def _recall(self, outcome: str, severity: str = "low") -> list[dict]:
        return [{"repo": "x/y", "pr": 1, "similarity": 0.80, "outcome": outcome, "severity": severity, "summary": ""}]

    def test_approved_recall_uses_green_icon(self):
        assert "🟢" in format_recall_section(self._recall("approved"))

    def test_warned_recall_uses_orange_icon(self):
        assert "🟠" in format_recall_section(self._recall("warned", "medium"))

    def test_unknown_outcome_uses_white_icon(self):
        assert "⚪" in format_recall_section(self._recall("unknown_status"))

    def test_no_summary_skips_quote_line(self):
        recalls = [
            {"repo": "x/y", "pr": 1, "similarity": 0.80, "outcome": "blocked", "severity": "high", "summary": ""}
        ]
        output = format_recall_section(recalls)
        assert "  > _" not in output  # no markdown blockquote line

    def test_multiple_recalls_all_present(self):
        recalls = [
            {"repo": "a/b", "pr": 1, "similarity": 0.90, "outcome": "blocked", "severity": "high", "summary": ""},
            {"repo": "c/d", "pr": 2, "similarity": 0.85, "outcome": "approved", "severity": "low", "summary": ""},
        ]
        output = format_recall_section(recalls)
        assert "a/b#1" in output
        assert "c/d#2" in output


# ── store_memory ──────────────────────────────────────────────────────────────


class TestStoreMemory:
    def _mock_db(self) -> AsyncMock:
        mock = AsyncMock()
        mock.add = MagicMock()
        mock.flush = AsyncMock()
        mock.execute = AsyncMock()
        mock.commit = AsyncMock()
        return mock

    @pytest.mark.asyncio
    async def test_no_findings_does_nothing(self):
        db = self._mock_db()
        await store_memory(
            db,
            org_id="org-1",
            analysis_id="ana-1",
            repo_full_name="acme/infra",
            pr_number=1,
            findings=[],
            outcome="approved",
            risk_score=10,
        )
        db.add.assert_not_called()
        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_blast_radius_high_when_score_gte_70(self):
        db = self._mock_db()
        added_rows = []
        db.add.side_effect = lambda obj: added_rows.append(obj)
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("no embed")):
            await store_memory(
                db,
                org_id="org-1",
                analysis_id="ana-1",
                repo_full_name="acme/infra",
                pr_number=1,
                findings=[_finding()],
                outcome="blocked",
                risk_score=70,
            )
        assert any(getattr(r, "blast_radius", None) == "high" for r in added_rows)

    @pytest.mark.asyncio
    async def test_blast_radius_medium_when_score_40_to_69(self):
        db = self._mock_db()
        added_rows = []
        db.add.side_effect = lambda obj: added_rows.append(obj)
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("no embed")):
            await store_memory(
                db,
                org_id="org-1",
                analysis_id="ana-1",
                repo_full_name="acme/infra",
                pr_number=1,
                findings=[_finding()],
                outcome="warned",
                risk_score=55,
            )
        assert any(getattr(r, "blast_radius", None) == "medium" for r in added_rows)

    @pytest.mark.asyncio
    async def test_blast_radius_low_when_score_below_40(self):
        db = self._mock_db()
        added_rows = []
        db.add.side_effect = lambda obj: added_rows.append(obj)
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("no embed")):
            await store_memory(
                db,
                org_id="org-1",
                analysis_id="ana-1",
                repo_full_name="acme/infra",
                pr_number=1,
                findings=[_finding()],
                outcome="approved",
                risk_score=10,
            )
        assert any(getattr(r, "blast_radius", None) == "low" for r in added_rows)

    @pytest.mark.asyncio
    async def test_severity_taken_from_first_finding(self):
        db = self._mock_db()
        added_rows = []
        db.add.side_effect = lambda obj: added_rows.append(obj)
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("no embed")):
            await store_memory(
                db,
                org_id="org-1",
                analysis_id="ana-1",
                repo_full_name="acme/infra",
                pr_number=1,
                findings=[_finding(severity="critical"), _finding(severity="low")],
                outcome="blocked",
                risk_score=80,
            )
        assert any(getattr(r, "severity", None) == "critical" for r in added_rows)

    @pytest.mark.asyncio
    async def test_embed_failure_still_commits(self):
        """Embedding failure is non-blocking — row still committed."""
        db = self._mock_db()
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("pgvector down")):
            await store_memory(
                db,
                org_id="org-1",
                analysis_id="ana-1",
                repo_full_name="acme/infra",
                pr_number=1,
                findings=[_finding()],
                outcome="blocked",
                risk_score=80,
            )
        db.commit.assert_awaited_once()


# ── recall_similar ────────────────────────────────────────────────────────────


class TestRecallSimilar:
    @pytest.mark.asyncio
    async def test_no_findings_returns_empty(self):
        db = AsyncMock()
        result = await recall_similar(db, installation_id=42, findings=[])
        assert result == []
        db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_unknown_org_returns_empty(self):
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        result = await recall_similar(db, installation_id=9999, findings=[_finding()])
        assert result == []

    @pytest.mark.asyncio
    async def test_pgvector_and_fallback_both_fail_returns_empty(self):
        org = _org()
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=org)))
        with patch("driftguard.services.memory_recall.embed", side_effect=RuntimeError("service down")):
            result = await recall_similar(db, installation_id=42, findings=[_finding()])
        assert result == []
