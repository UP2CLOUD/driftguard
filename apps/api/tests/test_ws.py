"""Tests for WebSocket live event stream — auth-rejection and mount checks."""

from unittest.mock import AsyncMock, patch

import pytest
from starlette.testclient import WebSocketDisconnect

from driftguard.main import app


class TestWebSocketAuth:
    def test_no_token_closes_with_policy_violation(self):
        """Connection without ?token= should be rejected with code 1008."""
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with client.websocket_connect("/api/v1/ws/events/some-org-id"):
                    pass
        assert exc_info.value.code == 1008

    def test_wrong_org_id_closes_connection(self):
        """Token valid for org-A must not open stream for org-B (rejected pre-accept)."""
        from fastapi.testclient import TestClient

        from driftguard.middleware.rbac import Principal, Role

        fake_principal = Principal(
            org_id="org-A",
            user_id="u1",
            role=Role.MEMBER,
            auth_type="api_token",
        )

        with (
            patch(
                "driftguard.api.v1.ws._resolve_api_token",
                new=AsyncMock(return_value=fake_principal),
            ),
            patch("driftguard.api.v1.ws.aioredis.from_url"),
        ):
            with TestClient(app) as client:
                with pytest.raises(WebSocketDisconnect) as exc_info:
                    with client.websocket_connect("/api/v1/ws/events/org-B?token=dg_live_x"):
                        pass
        assert exc_info.value.code == 1008


@pytest.mark.asyncio
async def test_ws_router_mounted():
    """ws/events endpoint is reachable (route exists)."""
    routes = [r.path for r in app.routes]
    assert any("ws/events" in p for p in routes), f"ws/events not in routes: {routes}"
