"""Unit tests for driftguard.services.analysis.ai_review — deterministic paths only."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from driftguard.services.analysis.ai_review import (
    AIReview,
    _build_prompt,
    _static_fallback,
    run_ai_review,
)
from driftguard.services.scanner.engine import (
    Category,
    ScanFinding,
    ScanResult,
    Severity,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _finding(
    severity: Severity = Severity.HIGH,
    category: Category = Category.IAM,
    rule_id: str = "TF001",
    title: str = "IAM wildcard",
    suggestion: str | None = "Restrict to specific ARNs",
    resource: str = "aws_iam_policy.admin",
    file: str = "main.tf",
    line: int = 10,
) -> ScanFinding:
    return ScanFinding(
        rule_id=rule_id,
        severity=severity,
        category=category,
        title=title,
        message="Overly permissive IAM policy",
        suggestion=suggestion,
        resource=resource,
        file=file,
        line=line,
    )


def _result(findings: list[ScanFinding] | None = None, files_scanned: int = 3) -> ScanResult:
    return ScanResult(
        directory="/repo",
        findings=findings or [],
        files_scanned=files_scanned,
        tf_files=2,
        k8s_files=1,
        gha_files=0,
    )


# ── AIReview dataclass ─────────────────────────────────────────────────────────


class TestAIReviewDataclass:
    def test_defaults(self):
        r = AIReview(narrative="text", model="static", input_tokens=0, output_tokens=0)
        assert not r.cached
        assert not r.skipped

    def test_skipped_flag(self):
        r = AIReview(narrative="", model="none", input_tokens=0, output_tokens=0, skipped=True)
        assert r.skipped

    def test_cached_flag(self):
        r = AIReview(narrative="txt", model="claude", input_tokens=10, output_tokens=5, cached=True)
        assert r.cached


# ── _build_prompt ──────────────────────────────────────────────────────────────


class TestBuildPrompt:
    def test_includes_repo_name(self):
        result = _result([_finding()])
        prompt = _build_prompt(result, {"repo": "acme/infra"})
        assert "acme/infra" in prompt

    def test_includes_risk_score(self):
        result = _result([_finding(severity=Severity.CRITICAL)])
        prompt = _build_prompt(result, {})
        assert "/100" in prompt

    def test_includes_files_scanned(self):
        result = _result([_finding()], files_scanned=7)
        prompt = _build_prompt(result, {})
        assert "7" in prompt

    def test_findings_json_embedded(self):
        result = _result([_finding(rule_id="IAM001")])
        prompt = _build_prompt(result, {})
        assert "IAM001" in prompt
        assert "```json" in prompt

    def test_empty_context_uses_defaults(self):
        result = _result([_finding()])
        prompt = _build_prompt(result, {})
        assert "unknown" in prompt  # repo defaults to 'unknown'
        assert "HEAD" in prompt

    def test_ref_included(self):
        result = _result([_finding()])
        prompt = _build_prompt(result, {"ref": "refs/heads/main"})
        assert "refs/heads/main" in prompt

    def test_finding_severity_included(self):
        result = _result([_finding(severity=Severity.CRITICAL)])
        prompt = _build_prompt(result, {})
        assert "critical" in prompt.lower()

    def test_finding_suggestion_included(self):
        result = _result([_finding(suggestion="Use least privilege")])
        prompt = _build_prompt(result, {})
        assert "Use least privilege" in prompt

    def test_none_suggestion_handled(self):
        result = _result([_finding(suggestion=None)])
        prompt = _build_prompt(result, {})
        assert "null" in prompt  # JSON null

    def test_multiple_findings_all_in_prompt(self):
        findings = [_finding(rule_id=f"R{i}") for i in range(5)]
        result = _result(findings)
        prompt = _build_prompt(result, {})
        for i in range(5):
            assert f"R{i}" in prompt


# ── _static_fallback ───────────────────────────────────────────────────────────


class TestStaticFallback:
    def test_includes_risk_score(self):
        result = _result([_finding(severity=Severity.CRITICAL)])
        review = _static_fallback(result)
        assert str(result.risk_score) in review.narrative

    def test_model_is_static_fallback(self):
        review = _static_fallback(_result([_finding()]))
        assert review.model == "static-fallback"

    def test_zero_tokens(self):
        review = _static_fallback(_result([_finding()]))
        assert review.input_tokens == 0
        assert review.output_tokens == 0

    def test_critical_findings_in_output(self):
        result = _result([_finding(severity=Severity.CRITICAL, rule_id="C001")])
        review = _static_fallback(result)
        assert "C001" in review.narrative

    def test_high_findings_in_output(self):
        result = _result([_finding(severity=Severity.HIGH, rule_id="H001")])
        review = _static_fallback(result)
        assert "H001" in review.narrative

    def test_medium_findings_in_output(self):
        result = _result([_finding(severity=Severity.MEDIUM, rule_id="M001")])
        review = _static_fallback(result)
        assert "M001" in review.narrative

    def test_summary_section_present(self):
        review = _static_fallback(_result([_finding()]))
        assert "## Summary" in review.narrative

    def test_remediation_checklist_present(self):
        review = _static_fallback(_result([_finding()]))
        assert "Remediation checklist" in review.narrative

    def test_no_findings_still_produces_summary(self):
        review = _static_fallback(_result([]))
        assert "## Summary" in review.narrative
        assert "0" in review.narrative

    def test_suggestion_in_checklist(self):
        result = _result([_finding(suggestion="Restrict to ARNs")])
        review = _static_fallback(result)
        assert "Restrict to ARNs" in review.narrative

    def test_no_suggestion_uses_title(self):
        result = _result([_finding(suggestion=None, title="IAM Wildcard Resource")])
        review = _static_fallback(result)
        assert "IAM Wildcard Resource" in review.narrative

    def test_caps_at_five_checklist_items(self):
        findings = [_finding(rule_id=f"R{i}", suggestion=f"Fix {i}") for i in range(10)]
        result = _result(findings)
        review = _static_fallback(result)
        # At most 5 checklist items
        checklist_lines = [line for line in review.narrative.splitlines() if line.startswith("- [ ]")]
        assert len(checklist_lines) <= 5


# ── run_ai_review — no API key ─────────────────────────────────────────────────


class TestRunAiReviewNoApiKey:
    @pytest.mark.asyncio
    async def test_returns_skipped_when_no_key(self):
        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings:
            mock_settings.anthropic_api_key = None
            review = await run_ai_review(_result([_finding()]))
        assert review.skipped
        assert review.model == "none"

    @pytest.mark.asyncio
    async def test_narrative_mentions_api_key(self):
        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings:
            mock_settings.anthropic_api_key = None
            review = await run_ai_review(_result([_finding()]))
        assert "ANTHROPIC_API_KEY" in review.narrative

    @pytest.mark.asyncio
    async def test_empty_findings_returns_clean(self):
        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings:
            mock_settings.anthropic_api_key = "sk-test-key"
            review = await run_ai_review(_result([]))
        assert review.skipped
        assert "clean" in review.narrative.lower() or "No findings" in review.narrative

    @pytest.mark.asyncio
    async def test_no_api_key_short_circuits(self):
        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings:
            mock_settings.anthropic_api_key = None
            # Should not attempt any external calls
            review = await run_ai_review(_result([_finding()]))
        assert review.input_tokens == 0
        assert review.output_tokens == 0


# ── run_ai_review — Anthropic API path ────────────────────────────────────────


class TestRunAiReviewWithAnthropic:
    @pytest.mark.asyncio
    async def test_uses_anthropic_when_key_set(self):
        mock_content = MagicMock()
        mock_content.text = "## Summary\nGood analysis"
        mock_response = MagicMock()
        mock_response.content = [mock_content]
        mock_response.model = "claude-haiku-4-5-20251001"
        mock_response.usage.input_tokens = 100
        mock_response.usage.output_tokens = 50

        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_response)

        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings, \
             patch("anthropic.AsyncAnthropic", return_value=mock_client):
            mock_settings.anthropic_api_key = "sk-ant-test"
            review = await run_ai_review(_result([_finding()]))

        assert review.narrative == "## Summary\nGood analysis"
        assert review.model == "claude-haiku-4-5-20251001"
        assert review.input_tokens == 100
        assert review.output_tokens == 50
        assert not review.skipped

    @pytest.mark.asyncio
    async def test_falls_back_to_static_on_anthropic_error(self):
        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(side_effect=RuntimeError("API down"))

        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings, \
             patch("anthropic.AsyncAnthropic", return_value=mock_client):
            mock_settings.anthropic_api_key = "sk-ant-test"
            mock_settings.gemini_api_key = None
            review = await run_ai_review(_result([_finding(rule_id="R99")]))

        # Static fallback should still include finding info
        assert review.model == "static-fallback"
        assert "R99" in review.narrative

    @pytest.mark.asyncio
    async def test_context_passed_to_prompt(self):
        captured: dict = {}

        async def capture_create(**kwargs):
            captured["messages"] = kwargs["messages"]
            mock_content = MagicMock()
            mock_content.text = "ok"
            resp = MagicMock()
            resp.content = [mock_content]
            resp.model = "claude-haiku-4-5-20251001"
            resp.usage.input_tokens = 10
            resp.usage.output_tokens = 5
            return resp

        mock_client = AsyncMock()
        mock_client.messages.create = capture_create

        with patch("driftguard.services.analysis.ai_review.settings") as mock_settings, \
             patch("anthropic.AsyncAnthropic", return_value=mock_client):
            mock_settings.anthropic_api_key = "sk-ant-test"
            await run_ai_review(_result([_finding()]), context={"repo": "myorg/myrepo"})

        assert "myorg/myrepo" in captured["messages"][0]["content"]
