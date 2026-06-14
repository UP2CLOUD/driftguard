"""Unit tests for driftguard.integrations.github — HTTP calls mocked via AsyncMock."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ── tarball_url (pure function) ───────────────────────────────────────────────


class TestTarballUrl:
    def test_with_ref(self):
        from driftguard.integrations.github import tarball_url

        url = tarball_url("acme/infra", ref="abc1234")
        assert url == "https://api.github.com/repos/acme/infra/tarball/abc1234"

    def test_without_ref_omits_suffix(self):
        from driftguard.integrations.github import tarball_url

        url = tarball_url("acme/infra")
        assert url == "https://api.github.com/repos/acme/infra/tarball"
        assert url.endswith("/tarball")

    def test_none_ref_omits_suffix(self):
        from driftguard.integrations.github import tarball_url

        url = tarball_url("org/repo", ref=None)
        assert not url.endswith("/None")

    def test_url_contains_repo_full_name(self):
        from driftguard.integrations.github import tarball_url

        url = tarball_url("my-org/my-repo", ref="main")
        assert "my-org/my-repo" in url


# ── request_pr_review ─────────────────────────────────────────────────────────


def _mock_response(status_code: int = 200):
    resp = MagicMock()
    resp.status_code = status_code
    return resp


def _async_client_ctx(response):
    """Build a mock httpx.AsyncClient context manager returning the given response."""
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=response)
    mock_client.get = AsyncMock(return_value=response)
    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=mock_client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm, mock_client


class TestRequestPrReview:
    @pytest.mark.asyncio
    async def test_200_accepted(self):
        from driftguard.integrations.github import request_pr_review

        cm, client = _async_client_ctx(_mock_response(200))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await request_pr_review("tok", "acme/infra", 7)
        client.post.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_422_is_acceptable(self):
        """422 means 'already requested' — must not raise or warn."""
        from driftguard.integrations import github as gh_mod
        from driftguard.integrations.github import request_pr_review

        cm, _ = _async_client_ctx(_mock_response(422))
        with (
            patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm),
            patch.object(gh_mod.log, "warning") as mock_warn,
        ):
            await request_pr_review("tok", "acme/infra", 7)
        mock_warn.assert_not_called()

    @pytest.mark.asyncio
    async def test_unexpected_status_logs_warning(self):
        from driftguard.integrations import github as gh_mod
        from driftguard.integrations.github import request_pr_review

        cm, _ = _async_client_ctx(_mock_response(500))
        with (
            patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm),
            patch.object(gh_mod.log, "warning") as mock_warn,
        ):
            await request_pr_review("tok", "acme/infra", 7)
        mock_warn.assert_called_once()


# ── submit_pr_review ──────────────────────────────────────────────────────────


class TestSubmitPrReview:
    @pytest.mark.asyncio
    async def test_success_calls_post_once(self):
        from driftguard.integrations.github import submit_pr_review

        cm, client = _async_client_ctx(_mock_response(200))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await submit_pr_review("tok", "acme/infra", 7, "sha123", event="COMMENT", body="LGTM")
        assert client.post.await_count == 1

    @pytest.mark.asyncio
    async def test_422_with_inline_comments_retries_without_them(self):
        """When inline_comments cause a 422, retry with comments removed."""
        from driftguard.integrations.github import submit_pr_review

        cm = AsyncMock()
        mock_client = AsyncMock()
        # First call: 422; second call: 201
        mock_client.post = AsyncMock(side_effect=[_mock_response(422), _mock_response(201)])
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__ = AsyncMock(return_value=False)

        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await submit_pr_review(
                "tok",
                "acme/infra",
                7,
                "sha123",
                event="REQUEST_CHANGES",
                body="Fix this",
                inline_comments=[{"path": "main.tf", "line": 10, "body": "insecure"}],
            )
        assert mock_client.post.await_count == 2

    @pytest.mark.asyncio
    async def test_non_200_logs_warning(self):
        from driftguard.integrations import github as gh_mod
        from driftguard.integrations.github import submit_pr_review

        resp = _mock_response(500)
        resp.text = "Internal Server Error"
        cm, _ = _async_client_ctx(resp)
        with (
            patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm),
            patch.object(gh_mod.log, "warning") as mock_warn,
        ):
            await submit_pr_review("tok", "acme/infra", 7, "sha", event="COMMENT", body="b")
        mock_warn.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_inline_comments_does_not_retry(self):
        """When no inline_comments are provided, a 422 does NOT trigger a retry."""
        from driftguard.integrations.github import submit_pr_review

        cm, client = _async_client_ctx(_mock_response(422))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            resp_mock = _mock_response(422)
            resp_mock.text = "err"
            client.post = AsyncMock(return_value=resp_mock)
            await submit_pr_review("tok", "acme/infra", 7, "sha", event="COMMENT", body="b")
        # Only one call — no retry when there are no inline_comments to strip
        assert client.post.await_count == 1


# ── fetch_pr_files ────────────────────────────────────────────────────────────


class TestFetchPrFiles:
    @pytest.mark.asyncio
    async def test_single_page_returns_files(self):
        from driftguard.integrations.github import fetch_pr_files

        files = [{"filename": "main.tf", "patch": "@@ ..."}]
        resp = MagicMock()
        resp.status_code = 200
        resp.json = MagicMock(return_value=files)

        cm, client = _async_client_ctx(resp)
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            result = await fetch_pr_files("tok", "acme/infra", 42)
        assert result == files

    @pytest.mark.asyncio
    async def test_empty_page_returns_empty_list(self):
        from driftguard.integrations.github import fetch_pr_files

        resp = MagicMock()
        resp.status_code = 200
        resp.json = MagicMock(return_value=[])

        cm, client = _async_client_ctx(resp)
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            result = await fetch_pr_files("tok", "acme/infra", 42)
        assert result == []

    @pytest.mark.asyncio
    async def test_non_200_breaks_and_returns_empty(self):
        from driftguard.integrations import github as gh_mod
        from driftguard.integrations.github import fetch_pr_files

        resp = _mock_response(403)
        cm, client = _async_client_ctx(resp)
        with (
            patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm),
            patch.object(gh_mod.log, "warning"),
        ):
            result = await fetch_pr_files("tok", "acme/infra", 42)
        assert result == []

    @pytest.mark.asyncio
    async def test_pagination_fetches_second_page(self):
        """When first page has 100 items, a second GET is made for page 2."""
        from driftguard.integrations.github import fetch_pr_files

        page1 = [{"filename": f"file{i}.tf"} for i in range(100)]
        page2 = [{"filename": "last.tf"}]

        cm = AsyncMock()
        mock_client = AsyncMock()
        resp1 = MagicMock()
        resp1.status_code = 200
        resp1.json = MagicMock(return_value=page1)
        resp2 = MagicMock()
        resp2.status_code = 200
        resp2.json = MagicMock(return_value=page2)

        mock_client.get = AsyncMock(side_effect=[resp1, resp2])
        cm.__aenter__ = AsyncMock(return_value=mock_client)
        cm.__aexit__ = AsyncMock(return_value=False)

        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            result = await fetch_pr_files("tok", "acme/infra", 1)

        assert len(result) == 101
        assert mock_client.get.await_count == 2


# ── post_check_run ────────────────────────────────────────────────────────────


class TestPostCheckRun:
    @pytest.mark.asyncio
    async def test_success_does_not_raise(self):
        from driftguard.integrations.github import post_check_run

        cm, client = _async_client_ctx(_mock_response(201))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await post_check_run(
                "tok",
                "acme/infra",
                "abc123",
                conclusion="success",
                title="All checks passed",
                summary="Risk score: 12",
            )
        client.post.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_title_truncated_at_200_chars(self):
        from driftguard.integrations.github import post_check_run

        long_title = "x" * 300
        cm, client = _async_client_ctx(_mock_response(201))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await post_check_run("tok", "acme/infra", "sha", conclusion="success", title=long_title, summary="s")
        payload = client.post.call_args[1]["json"]
        assert len(payload["output"]["title"]) == 200

    @pytest.mark.asyncio
    async def test_summary_truncated_at_65535_chars(self):
        from driftguard.integrations.github import post_check_run

        long_summary = "s" * 70000
        cm, client = _async_client_ctx(_mock_response(201))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await post_check_run("tok", "acme/infra", "sha", conclusion="success", title="t", summary=long_summary)
        payload = client.post.call_args[1]["json"]
        assert len(payload["output"]["summary"]) == 65535

    @pytest.mark.asyncio
    async def test_details_url_included_when_provided(self):
        from driftguard.integrations.github import post_check_run

        cm, client = _async_client_ctx(_mock_response(201))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await post_check_run(
                "tok",
                "acme/infra",
                "sha",
                conclusion="failure",
                title="Blocked",
                summary="Public S3",
                details_url="https://app.driftguard.io/analyses/1",
            )
        payload = client.post.call_args[1]["json"]
        assert payload["details_url"] == "https://app.driftguard.io/analyses/1"

    @pytest.mark.asyncio
    async def test_details_url_absent_when_not_provided(self):
        from driftguard.integrations.github import post_check_run

        cm, client = _async_client_ctx(_mock_response(201))
        with patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm):
            await post_check_run("tok", "acme/infra", "sha", conclusion="success", title="t", summary="s")
        payload = client.post.call_args[1]["json"]
        assert "details_url" not in payload

    @pytest.mark.asyncio
    async def test_400_status_logs_warning(self):
        from driftguard.integrations import github as gh_mod
        from driftguard.integrations.github import post_check_run

        resp = _mock_response(422)
        resp.text = "Unprocessable"
        cm, _ = _async_client_ctx(resp)
        with (
            patch("driftguard.integrations.github.httpx.AsyncClient", return_value=cm),
            patch.object(gh_mod.log, "warning") as mock_warn,
        ):
            await post_check_run("tok", "acme/infra", "sha", conclusion="failure", title="t", summary="s")
        mock_warn.assert_called_once()
