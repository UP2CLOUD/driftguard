"""HTTP-level tests for POST /api/v1/webhooks/stripe."""

from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.main import app

AUTH_HDR = {"stripe-signature": "t=123,v1=abc"}


def _make_db(*, claimed: bool = True):
    """Return a mock AsyncSession that simulates the idempotency INSERT."""
    mock = AsyncMock()
    # claimed=True → INSERT returned a row (first delivery)
    # claimed=False → INSERT returned nothing (duplicate)
    claimed_result = MagicMock()
    claimed_result.scalar_one_or_none.return_value = "evt_1" if claimed else None

    async def _execute(stmt, params=None):
        return claimed_result

    mock.execute = _execute
    mock.commit = AsyncMock()
    mock.rollback = AsyncMock()
    return mock


def _override(session):
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _cleanup():
    app.dependency_overrides.pop(get_db, None)


FAKE_EVENT = {
    "id": "evt_1",
    "type": "customer.subscription.created",
    "data": {"object": {}},
}


class TestStripeWebhookEndpoint:
    def test_missing_signature_returns_401(self):
        with TestClient(app) as client:
            r = client.post("/api/v1/webhooks/stripe", content=b"{}")
        assert r.status_code == 401

    def test_invalid_signature_returns_401(self):
        _override(_make_db())
        try:
            with patch(
                "driftguard.api.v1.stripe_webhooks.verify_webhook",
                side_effect=ValueError("bad sig"),
            ):
                with TestClient(app) as client:
                    r = client.post(
                        "/api/v1/webhooks/stripe",
                        content=b"{}",
                        headers=AUTH_HDR,
                    )
            assert r.status_code == 401
        finally:
            _cleanup()

    def test_valid_event_returns_received(self):
        _override(_make_db(claimed=True))
        try:
            with (
                patch(
                    "driftguard.api.v1.stripe_webhooks.verify_webhook",
                    return_value=FAKE_EVENT,
                ),
                patch(
                    "driftguard.api.v1.stripe_webhooks.apply_subscription_event",
                    new_callable=AsyncMock,
                ),
            ):
                with TestClient(app) as client:
                    r = client.post(
                        "/api/v1/webhooks/stripe",
                        content=b'{"type":"customer.subscription.created"}',
                        headers=AUTH_HDR,
                    )
            assert r.status_code == 200
            assert r.json() == {"received": True}
        finally:
            _cleanup()

    def test_duplicate_event_returns_duplicate_flag(self):
        _override(_make_db(claimed=False))
        try:
            with patch(
                "driftguard.api.v1.stripe_webhooks.verify_webhook",
                return_value=FAKE_EVENT,
            ):
                with TestClient(app) as client:
                    r = client.post(
                        "/api/v1/webhooks/stripe",
                        content=b"{}",
                        headers=AUTH_HDR,
                    )
            assert r.status_code == 200
            body = r.json()
            assert body["received"] is True
            assert body["duplicate"] is True
        finally:
            _cleanup()

    def test_apply_failure_rolls_back_and_raises(self):
        _override(_make_db(claimed=True))
        try:
            with (
                patch(
                    "driftguard.api.v1.stripe_webhooks.verify_webhook",
                    return_value=FAKE_EVENT,
                ),
                patch(
                    "driftguard.api.v1.stripe_webhooks.apply_subscription_event",
                    new_callable=AsyncMock,
                    side_effect=RuntimeError("billing service down"),
                ),
            ):
                with TestClient(app, raise_server_exceptions=False) as client:
                    r = client.post(
                        "/api/v1/webhooks/stripe",
                        content=b"{}",
                        headers=AUTH_HDR,
                    )
            assert r.status_code == 500
        finally:
            _cleanup()
