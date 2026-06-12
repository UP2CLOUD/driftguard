"""Unit tests for RBAC middleware — role hierarchy, token resolution, generate."""

from __future__ import annotations

import hashlib
from unittest.mock import AsyncMock, MagicMock

import pytest

from driftguard.middleware.rbac import (
    Role,
    _has_role,
    _resolve_api_token,
    _resolve_jwt,
    generate_api_token,
)

# ── _has_role() ───────────────────────────────────────────────────────────────


class TestHasRole:
    """Verify the role hierarchy: VIEWER < MEMBER < ADMIN < OWNER."""

    def test_owner_satisfies_all_roles(self):
        assert _has_role(Role.OWNER, Role.VIEWER) is True
        assert _has_role(Role.OWNER, Role.MEMBER) is True
        assert _has_role(Role.OWNER, Role.ADMIN) is True
        assert _has_role(Role.OWNER, Role.OWNER) is True

    def test_admin_satisfies_up_to_admin(self):
        assert _has_role(Role.ADMIN, Role.VIEWER) is True
        assert _has_role(Role.ADMIN, Role.MEMBER) is True
        assert _has_role(Role.ADMIN, Role.ADMIN) is True
        assert _has_role(Role.ADMIN, Role.OWNER) is False

    def test_member_satisfies_viewer_and_member(self):
        assert _has_role(Role.MEMBER, Role.VIEWER) is True
        assert _has_role(Role.MEMBER, Role.MEMBER) is True
        assert _has_role(Role.MEMBER, Role.ADMIN) is False
        assert _has_role(Role.MEMBER, Role.OWNER) is False

    def test_viewer_satisfies_only_viewer(self):
        assert _has_role(Role.VIEWER, Role.VIEWER) is True
        assert _has_role(Role.VIEWER, Role.MEMBER) is False
        assert _has_role(Role.VIEWER, Role.ADMIN) is False
        assert _has_role(Role.VIEWER, Role.OWNER) is False


# ── generate_api_token() ──────────────────────────────────────────────────────


class TestGenerateApiToken:
    def test_live_prefix(self):
        raw, hashed = generate_api_token(prefix="live")
        assert raw.startswith("dg_live_")
        assert len(raw) > 20

    def test_test_prefix(self):
        raw, hashed = generate_api_token(prefix="test")
        assert raw.startswith("dg_test_")

    def test_hash_is_sha256(self):
        raw, hashed = generate_api_token()
        assert hashed == hashlib.sha256(raw.encode()).hexdigest()
        assert len(hashed) == 64

    def test_each_call_unique(self):
        raw1, _ = generate_api_token()
        raw2, _ = generate_api_token()
        assert raw1 != raw2


# ── _resolve_api_token() ──────────────────────────────────────────────────────


class TestResolveApiToken:
    def _mock_db(self, token_row=None) -> AsyncMock:
        mock = AsyncMock()
        mock.execute = AsyncMock(
            return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=token_row))
        )
        return mock

    @pytest.mark.asyncio
    async def test_wrong_prefix_returns_none(self):
        db = self._mock_db()
        result = await _resolve_api_token("Bearer wrong_prefix_token", db)
        assert result is None
        db.execute.assert_not_called()

    @pytest.mark.asyncio
    async def test_unknown_token_returns_none(self):
        db = self._mock_db(token_row=None)
        result = await _resolve_api_token("dg_live_unknowntoken123", db)
        assert result is None

    @pytest.mark.asyncio
    async def test_valid_token_returns_principal(self):
        from driftguard.db.models import APIToken

        token_row = APIToken(
            id="tok-1",
            org_id="org-1",
            role="org:member",
            revoked=False,
            scopes="read,write",
        )
        db = self._mock_db(token_row=token_row)
        result = await _resolve_api_token("dg_live_validtoken000", db)
        assert result is not None
        assert result.org_id == "org-1"
        assert result.role == Role.MEMBER
        assert result.auth_type == "api_token"
        assert "read" in result.scopes

    @pytest.mark.asyncio
    async def test_test_prefix_accepted(self):
        from driftguard.db.models import APIToken

        token_row = APIToken(
            id="tok-2",
            org_id="org-2",
            role="org:viewer",
            revoked=False,
            scopes="",
        )
        db = self._mock_db(token_row=token_row)
        result = await _resolve_api_token("dg_test_validtoken000", db)
        assert result is not None
        assert result.role == Role.VIEWER


# ── _resolve_jwt() ────────────────────────────────────────────────────────────

# 32-byte key avoids InsecureKeyLengthWarning from PyJWT
_TEST_JWT_SECRET = "test-secret-key-for-jwt-tests-32b"


class TestResolveJwt:
    @pytest.mark.asyncio
    async def test_invalid_jwt_returns_none(self):
        db = AsyncMock()
        result = await _resolve_jwt("not.a.jwt", db)
        assert result is None

    @pytest.mark.asyncio
    async def test_expired_jwt_returns_none(self):
        from unittest.mock import patch

        import jwt as pyjwt

        expired = pyjwt.encode(
            {"sub": "user-1", "org_id": "org-1", "role": "org:member", "exp": 1},
            _TEST_JWT_SECRET,
            algorithm="HS256",
        )
        db = AsyncMock()
        with patch("driftguard.core.config.settings") as mock_settings:
            mock_settings.secret_key = _TEST_JWT_SECRET
            result = await _resolve_jwt(expired, db)
        assert result is None

    @pytest.mark.asyncio
    async def test_valid_jwt_returns_principal(self):
        from datetime import UTC, datetime, timedelta
        from unittest.mock import patch

        import jwt as pyjwt

        payload = {
            "sub": "user-abc",
            "org_id": "org-xyz",
            "role": "org:admin",
            "exp": datetime.now(UTC) + timedelta(hours=1),
        }
        token = pyjwt.encode(payload, _TEST_JWT_SECRET, algorithm="HS256")
        db = AsyncMock()
        with patch("driftguard.core.config.settings") as mock_settings:
            mock_settings.secret_key = _TEST_JWT_SECRET
            result = await _resolve_jwt(token, db)
        assert result is not None
        assert result.user_id == "user-abc"
        assert result.org_id == "org-xyz"
        assert result.role == Role.ADMIN
        assert result.auth_type == "jwt"
