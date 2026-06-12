"""Tests for /api/v1/tokens endpoints (token management)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient

from driftguard.core.db import get_db
from driftguard.db.models import APIToken
from driftguard.main import app
from driftguard.middleware.rbac import Principal, Role, get_current_principal

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _admin_principal(org_id: str = "org-1") -> Principal:
    return Principal(user_id="user-1", org_id=org_id, role=Role.ADMIN, auth_type="test")


def _override_db(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _override_principal(principal: Principal) -> None:
    def _dep() -> Principal:
        return principal

    app.dependency_overrides[get_current_principal] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_principal, None)


def _token_row(
    token_id: str = "tok-1",
    name: str = "CI token",
    role: str = "org:member",
    org_id: str = "org-1",
) -> APIToken:
    now = datetime(2026, 1, 1, tzinfo=UTC)
    return APIToken(
        id=token_id,
        org_id=org_id,
        name=name,
        token_hash="deadbeef" * 8,
        role=role,
        revoked=False,
        created_at=now,
    )


# ── Auth enforcement ───────────────────────────────────────────────────────────


class TestTokensRequireAuth:
    def test_list_tokens_requires_auth(self):
        r = TestClient(app).get("/api/v1/tokens")
        assert r.status_code == 401

    def test_create_token_requires_auth(self):
        r = TestClient(app).post("/api/v1/tokens", json={"name": "test"})
        assert r.status_code == 401

    def test_revoke_token_requires_auth(self):
        r = TestClient(app).delete("/api/v1/tokens/tok-1")
        assert r.status_code == 401


# ── GET /tokens ────────────────────────────────────────────────────────────────


class TestListTokens:
    def test_returns_empty_list(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[]))))
        )
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).get("/api/v1/tokens", headers=AUTH)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            _cleanup()

    def test_returns_token_list(self):
        tok = _token_row()
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[tok]))))
        )
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).get("/api/v1/tokens", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert len(data) == 1
            assert data[0]["id"] == "tok-1"
            assert data[0]["name"] == "CI token"
            assert data[0]["role"] == "org:member"
            assert data[0]["revoked"] is False
        finally:
            _cleanup()


# ── POST /tokens ───────────────────────────────────────────────────────────────


class TestCreateToken:
    def test_invalid_role_returns_400(self):
        mock = AsyncMock()
        mock.add = MagicMock()
        mock.commit = AsyncMock()
        mock.refresh = AsyncMock()
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).post(
                "/api/v1/tokens",
                json={"name": "bad-role-token", "role": "superadmin"},
                headers=AUTH,
            )
            assert r.status_code == 400
            assert "Role" in r.json()["detail"]
        finally:
            _cleanup()

    def test_empty_name_returns_422(self):
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).post(
                "/api/v1/tokens",
                json={"name": ""},
                headers=AUTH,
            )
            assert r.status_code == 422
        finally:
            _cleanup()

    def test_create_token_returns_plaintext_once(self):
        from uuid import uuid4

        mock = AsyncMock()
        mock.add = MagicMock()
        mock.commit = AsyncMock()

        async def _refresh(obj):
            obj.id = str(uuid4())
            obj.expires_at = None

        mock.refresh = AsyncMock(side_effect=_refresh)
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).post(
                "/api/v1/tokens",
                json={"name": "deploy-key", "role": "org:member"},
                headers=AUTH,
            )
            assert r.status_code == 201
            data = r.json()
            assert "token" in data
            assert data["token"].startswith("dg_live_")
            assert data["name"] == "deploy-key"
            assert data["role"] == "org:member"
        finally:
            _cleanup()


# ── DELETE /tokens/{token_id} ─────────────────────────────────────────────────


class TestRevokeToken:
    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
        mock.commit = AsyncMock()
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).delete("/api/v1/tokens/nonexistent", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_revoke_sets_revoked_flag(self):
        tok = _token_row()
        mock = AsyncMock()
        mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=tok)))
        mock.commit = AsyncMock()
        mock.add = MagicMock()
        _override_db(mock)
        _override_principal(_admin_principal())
        try:
            r = TestClient(app).delete("/api/v1/tokens/tok-1", headers=AUTH)
            assert r.status_code == 204
            assert tok.revoked is True
        finally:
            _cleanup()
