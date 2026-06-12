import hashlib
import hmac
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from driftguard.core.config import settings
from driftguard.core.db import get_db
from driftguard.main import app


def _sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


def _signed_post(payload: dict, event: str, secret: str = "test-secret") -> tuple[bytes, str, str]:
    body = json.dumps(payload).encode()
    sig = _sign(body, secret)
    return body, sig, event


def _db_override(mock_session=None):
    if mock_session is None:
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        mock_session.commit = AsyncMock()
        mock_session.add = MagicMock()

    async def _override():
        yield mock_session

    app.dependency_overrides[get_db] = _override


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_github_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    payload = {"action": "opened"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/webhooks/github",
            json=payload,
            headers={"X-GitHub-Event": "pull_request", "X-Hub-Signature-256": "sha256=bogus"},
        )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_github_webhook_accepts_valid_signature(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    payload = {"action": "closed"}
    body = json.dumps(payload).encode()
    sig = _sign(body, "test-secret")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(
            "/api/v1/webhooks/github",
            content=body,
            headers={
                "X-GitHub-Event": "pull_request",
                "X-Hub-Signature-256": sig,
                "Content-Type": "application/json",
            },
        )
    assert r.status_code == 200
    assert r.json() == {"received": True}


@pytest.mark.asyncio
async def test_pr_opened_enqueues_analysis(monkeypatch):
    """pull_request opened → enqueue_pr_analysis is scheduled as a background task."""
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "opened",
        "installation": {"id": 123},
        "repository": {"full_name": "acme/infra"},
        "pull_request": {"number": 7, "head": {"sha": "abc123"}},
    }
    body, sig, event = _signed_post(payload, "pull_request")
    try:
        with patch("driftguard.api.v1.webhooks.enqueue_pr_analysis") as mock_enqueue:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        assert r.json() == {"received": True}
        mock_enqueue.assert_called_once_with(payload)
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_pr_synchronize_enqueues_analysis(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "synchronize",
        "installation": {"id": 123},
        "repository": {"full_name": "acme/infra"},
        "pull_request": {"number": 7, "head": {"sha": "def456"}},
    }
    body, sig, event = _signed_post(payload, "pull_request")
    try:
        with patch("driftguard.api.v1.webhooks.enqueue_pr_analysis") as mock_enqueue:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_enqueue.assert_called_once_with(payload)
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_pr_merged_enqueues_merge_handler(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "closed",
        "installation": {"id": 123},
        "repository": {"full_name": "acme/infra"},
        "pull_request": {"number": 7, "merged": True},
    }
    body, sig, event = _signed_post(payload, "pull_request")
    try:
        with patch("driftguard.api.v1.webhooks.enqueue_pr_merged") as mock_merged:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_merged.assert_called_once_with(payload)
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_pr_closed_without_merge_does_not_enqueue(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "closed",
        "installation": {"id": 123},
        "repository": {"full_name": "acme/infra"},
        "pull_request": {"number": 7, "merged": False},
    }
    body, sig, event = _signed_post(payload, "pull_request")
    try:
        with patch("driftguard.api.v1.webhooks.enqueue_pr_merged") as mock_merged:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_merged.assert_not_called()
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_installation_created_calls_upsert(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "created",
        "installation": {
            "id": 9999,
            "account": {"login": "acme", "type": "Organization"},
        },
        "repositories": [{"id": 1, "full_name": "acme/infra", "name": "infra"}],
    }
    body, sig, event = _signed_post(payload, "installation")
    try:
        with patch("driftguard.api.v1.webhooks.upsert_installation", new_callable=AsyncMock) as mock_upsert:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        assert r.json() == {"received": True}
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args
        assert call_kwargs.kwargs["installation_id"] == 9999
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_installation_deleted_calls_remove(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "deleted",
        "installation": {"id": 9999, "account": {"login": "acme", "type": "Organization"}},
        "repositories": [],
    }
    body, sig, event = _signed_post(payload, "installation")
    try:
        with patch("driftguard.api.v1.webhooks.remove_installation", new_callable=AsyncMock) as mock_remove:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_remove.assert_called_once()
        assert mock_remove.call_args.kwargs["installation_id"] == 9999
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_installation_repositories_added_calls_upsert(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "added",
        "installation": {"id": 9999},
        "repositories_added": [{"id": 2, "full_name": "acme/new-repo", "name": "new-repo"}],
        "repositories_removed": [],
    }
    body, sig, event = _signed_post(payload, "installation_repositories")
    try:
        with patch("driftguard.api.v1.webhooks.upsert_installation", new_callable=AsyncMock) as mock_upsert:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_upsert.assert_called_once()
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_installation_repositories_removed_calls_remove(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {
        "action": "removed",
        "installation": {"id": 9999},
        "repositories_added": [],
        "repositories_removed": [{"id": 1, "full_name": "acme/old-repo", "name": "old-repo"}],
    }
    body, sig, event = _signed_post(payload, "installation_repositories")
    try:
        with patch("driftguard.api.v1.webhooks.remove_repositories", new_callable=AsyncMock) as mock_remove:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/webhooks/github",
                    content=body,
                    headers={
                        "X-GitHub-Event": event,
                        "X-Hub-Signature-256": sig,
                        "Content-Type": "application/json",
                    },
                )
        assert r.status_code == 200
        mock_remove.assert_called_once()
    finally:
        _cleanup()


@pytest.mark.asyncio
async def test_unknown_event_type_is_ignored(monkeypatch):
    monkeypatch.setattr(settings, "github_webhook_secret", "test-secret")
    _db_override()
    payload = {"action": "something_new"}
    body, sig, event = _signed_post(payload, "marketplace_purchase")
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.post(
                "/api/v1/webhooks/github",
                content=body,
                headers={
                    "X-GitHub-Event": event,
                    "X-Hub-Signature-256": sig,
                    "Content-Type": "application/json",
                },
            )
        assert r.status_code == 200
    finally:
        _cleanup()
