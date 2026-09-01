"""Integration-style tests for RBAC FastAPI dependencies."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from fastapi import Depends, FastAPI, status
from fastapi.testclient import TestClient

from driftguard.middleware.rbac import (
    Principal,
    Role,
    get_current_principal,
    require_role,
)

# ── Test Fixtures & App Setup ─────────────────────────────────────────────────


def build_test_app(dependency_override):
    """Create a minimal FastAPI app with an overridden dependency."""
    app = FastAPI()

    # The actual endpoint logic doesn't matter, only the dependency resolution
    @app.get("/test_endpoint")
    async def _(p: Principal = dependency_override):
        return {"user_id": p.user_id}

    return app


@pytest.fixture
def mock_principal() -> Principal:
    """A default Principal for testing."""
    return Principal(
        user_id="test-user",
        org_id="test-org",
        role=Role.MEMBER,
        auth_type="jwt",
    )


# ── get_current_principal() Tests ─────────────────────────────────────────────


def test_get_current_principal_missing_auth_header():
    """Verify that missing 'Authorization' header raises 401."""
    app = FastAPI()

    @app.get("/test_endpoint")
    async def _(p: Principal = Depends(get_current_principal)): ...

    client = TestClient(app)
    response = client.get("/test_endpoint")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_principal_malformed_auth_header():
    """Verify that a malformed 'Authorization' header raises 401."""
    # This is handled by FastAPI's HTTPBearer scheme, but good to have a test
    app = FastAPI()

    @app.get("/test_endpoint")
    async def _(p: Principal = Depends(get_current_principal)): ...

    client = TestClient(app)
    response = client.get("/test_endpoint", headers={"Authorization": "NotBearer token"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_current_principal_jwt_resolves(mock_principal):
    """Verify a valid JWT is correctly resolved and returned."""
    from driftguard.middleware import rbac

    # Mock the underlying resolver
    rbac._resolve_jwt = AsyncMock(return_value=mock_principal)
    rbac._resolve_api_token = AsyncMock(return_value=None)

    app = FastAPI()

    @app.get("/")
    async def _(p: Principal = Depends(get_current_principal)):
        return {"user_id": p.user_id}

    client = TestClient(app)
    response = client.get("/", headers={"Authorization": "Bearer some.jwt.token"})
    assert response.status_code == 200
    assert response.json() == {"user_id": "test-user"}
    rbac._resolve_jwt.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_current_principal_api_token_resolves(mock_principal):
    """Verify a valid API token is correctly resolved."""
    from driftguard.middleware import rbac

    mock_principal_api = Principal(
        user_id="api-user",
        org_id="test-org",
        role=Role.ADMIN,
        auth_type="api_token",
    )

    rbac._resolve_jwt = AsyncMock(return_value=None)
    rbac._resolve_api_token = AsyncMock(return_value=mock_principal_api)

    app = FastAPI()

    @app.get("/")
    async def _(p: Principal = Depends(get_current_principal)):
        return {"user_id": p.user_id}

    client = TestClient(app)
    response = client.get("/", headers={"Authorization": "Bearer dg_live_mytoken"})
    assert response.status_code == 200
    assert response.json() == {"user_id": "api-user"}
    rbac._resolve_api_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_current_principal_invalid_token_raises_401():
    """Verify that if neither resolver finds a principal, a 401 is raised."""
    from driftguard.middleware import rbac

    rbac._resolve_jwt = AsyncMock(return_value=None)
    rbac._resolve_api_token = AsyncMock(return_value=None)

    app = FastAPI()

    @app.get("/")
    async def _(p: Principal = Depends(get_current_principal)): ...

    client = TestClient(app)
    response = client.get("/", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── require_role() Tests ──────────────────────────────────────────────────────


class TestRequireRole:
    def test_insufficient_role_raises_403(self):
        """Verify user with MEMBER role cannot access an ADMIN-only endpoint."""
        app = build_test_app(Depends(require_role("org:admin")))

        # Override the top-level dependency to inject our test principal
        app.dependency_overrides[get_current_principal] = lambda: Principal("test-user", "test-org", Role.MEMBER, "jwt")

        client = TestClient(app)
        response = client.get("/test_endpoint")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_sufficient_role_allows_access(self):
        """Verify user with ADMIN role CAN access an ADMIN-only endpoint."""
        app = build_test_app(Depends(require_role("org:admin")))
        app.dependency_overrides[get_current_principal] = lambda: Principal("test-user", "test-org", Role.ADMIN, "jwt")
        client = TestClient(app)
        response = client.get("/test_endpoint")
        assert response.status_code == 200

    def test_equal_role_allows_access(self):
        """Verify user with MEMBER role CAN access a MEMBER-or-higher endpoint."""
        app = build_test_app(Depends(require_role(Role.MEMBER)))
        app.dependency_overrides[get_current_principal] = lambda: Principal("test-user", "test-org", Role.MEMBER, "jwt")
        client = TestClient(app)
        response = client.get("/test_endpoint")
        assert response.status_code == 200

    def test_owner_can_access_any_endpoint(self):
        """Verify OWNER can access a VIEWER endpoint."""
        app = build_test_app(Depends(require_role(Role.VIEWER)))
        app.dependency_overrides[get_current_principal] = lambda: Principal("test-user", "test-org", Role.OWNER, "jwt")
        client = TestClient(app)
        response = client.get("/test_endpoint")
        assert response.status_code == 200

    def test_dependency_still_requires_auth(self):
        """Verify that if auth fails, require_role also fails (no bypass)."""
        app = build_test_app(Depends(require_role(Role.VIEWER)))

        # No override for get_current_principal = real auth dependency is used
        client = TestClient(app)
        response = client.get("/test_endpoint")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
