"""Unit tests for driftguard.services.email — dev-mode and send paths."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from driftguard.services.email import (
    _send,
    send_policy_violation,
    send_review_complete,
    send_welcome,
)

# ── _send (dev mode — no API key) ─────────────────────────────────────────────


class TestSendDevMode:
    @pytest.mark.asyncio
    async def test_does_not_raise_without_api_key(self):
        with patch("driftguard.services.email.settings") as s:
            s.resend_api_key = None
            await _send(to="user@example.com", subject="test", html="<p>hi</p>")

    @pytest.mark.asyncio
    async def test_does_not_call_resend_without_api_key(self):
        with patch("driftguard.services.email.settings") as s, \
             patch("driftguard.services.email.log") as mock_log:
            s.resend_api_key = None
            await _send(to="user@example.com", subject="test", html="<p>hi</p>")
        mock_log.info.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_with_api_key_calls_resend(self):
        mock_resend = MagicMock()
        mock_resend.Emails.send = MagicMock()

        with patch("driftguard.services.email.settings") as s, \
             patch.dict("sys.modules", {"resend": mock_resend}):
            s.resend_api_key = "re_live_test"
            s.resend_from = "noreply@driftguard.io"
            await _send(to="dev@example.com", subject="Hello", html="<b>test</b>")

        mock_resend.Emails.send.assert_called_once()
        call_args = mock_resend.Emails.send.call_args[0][0]
        assert call_args["to"] == ["dev@example.com"]
        assert call_args["subject"] == "Hello"
        assert call_args["from"] == "noreply@driftguard.io"

    @pytest.mark.asyncio
    async def test_send_error_does_not_raise(self):
        mock_resend = MagicMock()
        mock_resend.Emails.send = MagicMock(side_effect=RuntimeError("Resend down"))

        with patch("driftguard.services.email.settings") as s, \
             patch.dict("sys.modules", {"resend": mock_resend}):
            s.resend_api_key = "re_live_test"
            s.resend_from = "noreply@driftguard.io"
            await _send(to="u@x.com", subject="s", html="h")


# ── send_review_complete ───────────────────────────────────────────────────────


class TestSendReviewComplete:
    @pytest.mark.asyncio
    async def test_does_not_raise_in_dev_mode(self):
        with patch("driftguard.services.email.settings") as s:
            s.resend_api_key = None
            await send_review_complete(
                to="dev@example.com",
                repo="org/infra",
                pr_number=42,
                risk_score=75,
                findings_count=3,
                analysis_url="https://app.driftguard.io/analyses/abc",
            )

    @pytest.mark.asyncio
    async def test_subject_contains_pr_number(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["subject"] = subject

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_review_complete(
                to="u@x.com", repo="org/infra", pr_number=99,
                risk_score=30, findings_count=1, analysis_url="https://x.com",
            )

        assert "99" in captured["subject"]

    @pytest.mark.asyncio
    async def test_subject_contains_repo(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["subject"] = subject

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_review_complete(
                to="u@x.com", repo="my-org/terraform", pr_number=1,
                risk_score=10, findings_count=0, analysis_url="https://x.com",
            )

        assert "my-org/terraform" in captured["subject"]

    @pytest.mark.asyncio
    async def test_high_risk_label_for_score_over_70(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["html"] = html

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_review_complete(
                to="u@x.com", repo="org/r", pr_number=1,
                risk_score=85, findings_count=5, analysis_url="https://x.com",
            )

        assert "HIGH" in captured["html"]

    @pytest.mark.asyncio
    async def test_low_risk_label_for_score_under_40(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["html"] = html

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_review_complete(
                to="u@x.com", repo="org/r", pr_number=1,
                risk_score=20, findings_count=0, analysis_url="https://x.com",
            )

        assert "LOW" in captured["html"]

    @pytest.mark.asyncio
    async def test_analysis_url_in_html(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["html"] = html

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_review_complete(
                to="u@x.com", repo="org/r", pr_number=1,
                risk_score=50, findings_count=2,
                analysis_url="https://app.driftguard.io/analyses/xyz",
            )

        assert "https://app.driftguard.io/analyses/xyz" in captured["html"]


# ── send_policy_violation ─────────────────────────────────────────────────────


class TestSendPolicyViolation:
    @pytest.mark.asyncio
    async def test_does_not_raise_in_dev_mode(self):
        with patch("driftguard.services.email.settings") as s:
            s.resend_api_key = None
            await send_policy_violation(
                to="dev@example.com",
                repo="org/infra",
                pr_number=7,
                resource="aws_rds_cluster.main",
                reason="Deletes production database",
                analysis_url="https://app.driftguard.io/analyses/abc",
            )

    @pytest.mark.asyncio
    async def test_resource_in_subject(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["subject"] = subject

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_policy_violation(
                to="u@x.com", repo="org/r", pr_number=1,
                resource="aws_kms_key.main", reason="KMS deletion blocked",
                analysis_url="https://x.com",
            )

        assert "aws_kms_key.main" in captured["subject"]

    @pytest.mark.asyncio
    async def test_reason_in_html(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["html"] = html

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_policy_violation(
                to="u@x.com", repo="org/r", pr_number=1,
                resource="res", reason="Production DB delete blocked",
                analysis_url="https://x.com",
            )

        assert "Production DB delete blocked" in captured["html"]


# ── send_welcome ───────────────────────────────────────────────────────────────


class TestSendWelcome:
    @pytest.mark.asyncio
    async def test_does_not_raise_in_dev_mode(self):
        with patch("driftguard.services.email.settings") as s:
            s.resend_api_key = None
            await send_welcome(to="admin@example.com", org_name="Acme Corp")

    @pytest.mark.asyncio
    async def test_org_name_in_html(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["html"] = html

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_welcome(to="u@x.com", org_name="Globex Industries")

        assert "Globex Industries" in captured["html"]

    @pytest.mark.asyncio
    async def test_subject_contains_welcome(self):
        captured: dict = {}

        async def fake_send(*, to, subject, html):
            captured["subject"] = subject

        with patch("driftguard.services.email._send", side_effect=fake_send):
            await send_welcome(to="u@x.com", org_name="ACME")

        assert "Welcome" in captured["subject"] or "welcome" in captured["subject"].lower()
