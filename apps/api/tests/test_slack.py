"""Unit tests for driftguard.services.slack — payload structure and HTTP paths."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from driftguard.services.slack import notify_incident

# ── No webhook URL ────────────────────────────────────────────────────────────


class TestNoWebhookUrl:
    @pytest.mark.asyncio
    async def test_returns_false_when_no_webhook(self):
        with patch("driftguard.services.slack.settings") as s:
            s.slack_webhook_url = ""
            result = await notify_incident(title="test", severity="high", repo="org/repo")
        assert result is False

    @pytest.mark.asyncio
    async def test_returns_false_when_webhook_is_none(self):
        with patch("driftguard.services.slack.settings") as s:
            s.slack_webhook_url = None
            result = await notify_incident(title="test", severity="high", repo="org/repo")
        assert result is False

    @pytest.mark.asyncio
    async def test_does_not_call_http_when_no_webhook(self):
        with patch("driftguard.services.slack.settings") as s, patch("driftguard.services.slack.httpx") as mock_httpx:
            s.slack_webhook_url = ""
            await notify_incident(title="test", severity="high", repo="org/repo")
        mock_httpx.AsyncClient.assert_not_called()


# ── HTTP success ──────────────────────────────────────────────────────────────


class TestHttpSuccess:
    def _mock_response(self):
        resp = MagicMock()
        resp.raise_for_status = MagicMock()
        return resp

    @pytest.mark.asyncio
    async def test_returns_true_on_success(self):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=self._mock_response())

        with (
            patch("driftguard.services.slack.settings") as s,
            patch("driftguard.services.slack.httpx.AsyncClient", return_value=mock_client),
        ):
            s.slack_webhook_url = "https://hooks.slack.com/test"
            result = await notify_incident(title="DB deleted", severity="critical", repo="org/repo")
        assert result is True

    @pytest.mark.asyncio
    async def test_posts_to_webhook_url(self):
        captured: dict = {}
        mock_resp = self._mock_response()

        async def fake_post(url, *, json=None, **kwargs):
            captured["url"] = url
            captured["payload"] = json
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = fake_post

        with (
            patch("driftguard.services.slack.settings") as s,
            patch("driftguard.services.slack.httpx.AsyncClient", return_value=mock_client),
        ):
            s.slack_webhook_url = "https://hooks.slack.com/xyz"
            await notify_incident(title="test", severity="high", repo="org/repo")

        assert captured["url"] == "https://hooks.slack.com/xyz"
        assert "attachments" in captured["payload"]

    @pytest.mark.asyncio
    async def test_returns_false_on_http_error(self):
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(side_effect=Exception("connection refused"))

        with (
            patch("driftguard.services.slack.settings") as s,
            patch("driftguard.services.slack.httpx.AsyncClient", return_value=mock_client),
        ):
            s.slack_webhook_url = "https://hooks.slack.com/test"
            result = await notify_incident(title="test", severity="high", repo="org/repo")
        assert result is False


# ── Payload structure ─────────────────────────────────────────────────────────


class TestPayloadStructure:
    async def _capture_payload(self, title="test", severity="high", repo="org/repo", **kwargs) -> dict:
        captured: dict = {}

        async def fake_post(url, *, json=None, **kw):
            captured["payload"] = json
            resp = MagicMock()
            resp.raise_for_status = MagicMock()
            return resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = fake_post

        with (
            patch("driftguard.services.slack.settings") as s,
            patch("driftguard.services.slack.httpx.AsyncClient", return_value=mock_client),
        ):
            s.slack_webhook_url = "https://hooks.slack.com/test"
            await notify_incident(title=title, severity=severity, repo=repo, **kwargs)

        return captured.get("payload", {})

    @pytest.mark.asyncio
    async def test_title_in_payload(self):
        payload = await self._capture_payload(title="RDS cluster deleted")
        text = str(payload)
        assert "RDS cluster deleted" in text

    @pytest.mark.asyncio
    async def test_severity_uppercased_in_payload(self):
        payload = await self._capture_payload(severity="critical")
        text = str(payload)
        assert "CRITICAL" in text

    @pytest.mark.asyncio
    async def test_repo_in_payload(self):
        payload = await self._capture_payload(repo="my-org/terraform")
        text = str(payload)
        assert "my-org/terraform" in text

    @pytest.mark.asyncio
    async def test_pr_number_when_provided(self):
        payload = await self._capture_payload(pr_number=42)
        text = str(payload)
        assert "42" in text

    @pytest.mark.asyncio
    async def test_no_pr_number_uses_severity_fallback(self):
        payload = await self._capture_payload(severity="high", pr_number=None)
        # fields should have plain dicts, not nested dicts
        for attachment in payload.get("attachments", []):
            for block in attachment.get("blocks", []):
                for field in block.get("fields", []):
                    assert isinstance(field.get("text", ""), str), f"field 'text' should be str, got: {field}"

    @pytest.mark.asyncio
    async def test_no_risk_score_uses_status_fallback(self):
        payload = await self._capture_payload(risk_score=None)
        # Same: no nested dicts in fields
        for attachment in payload.get("attachments", []):
            for block in attachment.get("blocks", []):
                for field in block.get("fields", []):
                    assert isinstance(field.get("text", ""), str), f"field 'text' should be str, got: {field}"

    @pytest.mark.asyncio
    async def test_risk_score_in_payload(self):
        payload = await self._capture_payload(risk_score=85)
        text = str(payload)
        assert "85" in text

    @pytest.mark.asyncio
    async def test_findings_in_payload_when_provided(self):
        payload = await self._capture_payload(findings=["IAM wildcard", "S3 public"])
        text = str(payload)
        assert "IAM wildcard" in text

    @pytest.mark.asyncio
    async def test_findings_capped_at_five(self):
        many = [f"finding_{i}" for i in range(10)]
        payload = await self._capture_payload(findings=many)
        text = str(payload)
        for i in range(5):
            assert f"finding_{i}" in text
        for i in range(5, 10):
            assert f"finding_{i}" not in text

    @pytest.mark.asyncio
    async def test_analysis_url_as_button(self):
        payload = await self._capture_payload(analysis_url="https://app.driftguard.io/analyses/123")
        text = str(payload)
        assert "https://app.driftguard.io/analyses/123" in text

    @pytest.mark.asyncio
    async def test_critical_color_is_red(self):
        payload = await self._capture_payload(severity="critical")
        assert payload["attachments"][0]["color"] == "#ff4757"

    @pytest.mark.asyncio
    async def test_high_color_is_orange(self):
        payload = await self._capture_payload(severity="high")
        assert payload["attachments"][0]["color"] == "#ff8800"

    @pytest.mark.asyncio
    async def test_unknown_severity_uses_default_color(self):
        payload = await self._capture_payload(severity="info")
        assert payload["attachments"][0]["color"] == "#9aa0a6"
