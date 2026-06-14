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


class TestConnectionManager:
    """Unit tests for the in-process connection tracker."""

    def _make_ws(self):
        from unittest.mock import MagicMock

        return MagicMock()

    def test_count_unknown_org_returns_zero(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        assert mgr.count("nonexistent") == 0

    def test_register_increments_count(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        ws = self._make_ws()
        mgr.register("org-1", ws)
        assert mgr.count("org-1") == 1

    def test_register_two_sockets_same_org(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        ws1, ws2 = self._make_ws(), self._make_ws()
        mgr.register("org-1", ws1)
        mgr.register("org-1", ws2)
        assert mgr.count("org-1") == 2

    def test_unregister_removes_socket(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        ws = self._make_ws()
        mgr.register("org-1", ws)
        mgr.unregister("org-1", ws)
        assert mgr.count("org-1") == 0

    def test_unregister_unknown_org_is_noop(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        ws = self._make_ws()
        mgr.unregister("nonexistent", ws)  # must not raise
        assert mgr.count("nonexistent") == 0

    def test_unregister_one_of_two_sockets(self):
        from driftguard.api.v1.ws import _ConnectionManager

        mgr = _ConnectionManager()
        ws1, ws2 = self._make_ws(), self._make_ws()
        mgr.register("org-1", ws1)
        mgr.register("org-1", ws2)
        mgr.unregister("org-1", ws1)
        assert mgr.count("org-1") == 1
