import hashlib
import hmac
import json

import pytest
from httpx import ASGITransport, AsyncClient

from driftguard.core.config import settings
from driftguard.main import app


def _sign(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


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
