"""Tests for driftguard.ai.reviewer — deterministic paths, no LLM calls."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from driftguard.ai.findings import Finding


def _f(
    severity: str = "high",
    resource: str = "aws_s3_bucket.logs",
    message: str = "public bucket",
    suggestion: str | None = None,
    rule_id: str | None = "CKV_AWS_20",
) -> Finding:
    return Finding(
        type="security",
        severity=severity,
        resource=resource,
        message=message,
        suggestion=suggestion,
        rule_id=rule_id,
        controls=(),
    )


# ── _static_fallback ──────────────────────────────────────────────────────────


class TestStaticFallback:
    def test_empty_findings_produces_summary(self):
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([])
        assert "## Summary" in out
        assert "0 findings" in out

    def test_severity_counts_in_summary(self):
        from driftguard.ai.reviewer import _static_fallback

        findings = [_f("critical"), _f("critical"), _f("high")]
        out = _static_fallback(findings)
        assert "2 critical" in out
        assert "1 high" in out

    def test_security_section_present(self):
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([_f()])
        assert "## Security" in out

    def test_suggested_actions_section_present(self):
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([_f(suggestion="Add ACL block")])
        assert "## Suggested actions" in out

    def test_suggestion_appears_in_actions(self):
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([_f(suggestion="Enable versioning")])
        assert "Enable versioning" in out

    def test_no_suggestion_falls_back_to_message(self):
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([_f(message="bucket is public", suggestion=None)])
        assert "bucket is public" in out

    def test_caps_security_at_eight(self):
        """Only the first 8 findings appear in the Security section."""
        from driftguard.ai.reviewer import _static_fallback

        findings = [_f(resource=f"r{i}") for i in range(12)]
        out = _static_fallback(findings)
        # 12 resources but only 8 should appear
        listed = [line for line in out.splitlines() if line.startswith("- **")]
        assert len(listed) == 8

    def test_caps_actions_at_five(self):
        """Only the first 5 findings produce action items."""
        from driftguard.ai.reviewer import _static_fallback

        findings = [_f(suggestion=f"Fix {i}") for i in range(10)]
        out = _static_fallback(findings)
        action_lines = [line for line in out.splitlines() if line.startswith("- [ ]")]
        assert len(action_lines) == 5

    def test_severity_ordering_critical_before_low(self):
        """Critical findings should appear before low-severity ones in Security."""
        from driftguard.ai.reviewer import _static_fallback

        findings = [_f("low", resource="r_low"), _f("critical", resource="r_crit")]
        out = _static_fallback(findings)
        crit_pos = out.find("r_crit")
        low_pos = out.find("r_low")
        assert crit_pos < low_pos

    def test_suggestion_fix_note_included(self):
        """When a finding has a suggestion, the output includes '> Fix:'."""
        from driftguard.ai.reviewer import _static_fallback

        out = _static_fallback([_f(suggestion="Use KMS encryption")])
        assert "Fix: Use KMS encryption" in out


# ── _user_prompt ──────────────────────────────────────────────────────────────


class TestUserPrompt:
    def test_includes_repo_and_pr_number(self):
        from driftguard.ai.reviewer import _user_prompt

        ctx = {"repo": "acme/infra", "pr_number": 42, "head_sha": "abc1234def"}
        out = _user_prompt([], ctx)
        assert "acme/infra" in out
        assert "42" in out

    def test_head_sha_truncated_to_12_chars(self):
        from driftguard.ai.reviewer import _user_prompt

        sha = "a" * 40
        ctx = {"repo": "r", "pr_number": 1, "head_sha": sha}
        out = _user_prompt([], ctx)
        assert "a" * 12 in out
        assert "a" * 13 not in out

    def test_empty_head_sha_handled(self):
        from driftguard.ai.reviewer import _user_prompt

        ctx = {"repo": "r", "pr_number": 1}
        out = _user_prompt([], ctx)
        assert "Head:" in out  # key present even with empty sha

    def test_findings_json_embedded(self):
        from driftguard.ai.reviewer import _user_prompt

        findings = [_f(resource="aws_s3_bucket.uploads", message="open")]
        ctx = {"repo": "r", "pr_number": 1, "head_sha": "x"}
        out = _user_prompt(findings, ctx)
        assert "aws_s3_bucket.uploads" in out

    def test_compliance_context_block_present(self):
        from driftguard.ai.reviewer import _user_prompt

        out = _user_prompt([], {"repo": "r", "pr_number": 1, "head_sha": "x"})
        assert "Compliance context" in out


# ── review() — no-findings fast path ──────────────────────────────────────────


class TestReviewNoFindings:
    @pytest.mark.asyncio
    async def test_empty_findings_returns_static_message(self):
        from driftguard.ai.reviewer import review

        result = await review([], {"repo": "r", "pr_number": 1, "head_sha": "x"})
        assert "No material changes" in result
        assert "## Summary" in result

    @pytest.mark.asyncio
    async def test_empty_findings_does_not_call_llm(self):
        from driftguard.ai.reviewer import review

        with patch("driftguard.ai.reviewer.client") as mock_client:
            await review([], {"repo": "r", "pr_number": 1})
        mock_client.assert_not_called()


# ── review() — static fallback when no API keys ───────────────────────────────


class TestReviewStaticFallback:
    @pytest.mark.asyncio
    async def test_no_api_key_uses_static_fallback(self, monkeypatch):
        from driftguard.ai.reviewer import review
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "")
        monkeypatch.setattr(settings, "gemini_api_key", "")

        result = await review([_f()], {"repo": "r", "pr_number": 1, "head_sha": "x"})
        assert "## Summary" in result
        assert "## Security" in result

    @pytest.mark.asyncio
    async def test_anthropic_error_uses_static_fallback(self, monkeypatch):
        from driftguard.ai.reviewer import review
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        monkeypatch.setattr(settings, "gemini_api_key", "")

        fake_client = MagicMock()
        fake_client.messages.create = AsyncMock(side_effect=RuntimeError("API unavailable"))

        with patch("driftguard.ai.reviewer.client", return_value=fake_client):
            result = await review([_f()], {"repo": "r", "pr_number": 1, "head_sha": "x"})

        assert "## Summary" in result

    @pytest.mark.asyncio
    async def test_anthropic_success_returns_response(self, monkeypatch):
        from driftguard.ai.reviewer import review
        from driftguard.core.config import settings

        monkeypatch.setattr(settings, "anthropic_api_key", "sk-ant-test")
        monkeypatch.setattr(settings, "gemini_api_key", "")

        fake_msg = MagicMock()
        fake_msg.content = [MagicMock(type="text", text="## Summary\nRisky PR.")]

        fake_client = MagicMock()
        fake_client.messages.create = AsyncMock(return_value=fake_msg)

        with patch("driftguard.ai.reviewer.client", return_value=fake_client):
            result = await review([_f()], {"repo": "r", "pr_number": 1, "head_sha": "x"})

        assert "Risky PR." in result
