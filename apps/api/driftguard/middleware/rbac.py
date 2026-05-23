"""
RBAC middleware + FastAPI dependency injection.

Role hierarchy:
  org:owner   > org:admin > org:member > org:viewer > api_token

Enforcement:
  - All protected endpoints declare their required role via Depends(require_role(...))
  - Auth source: Bearer JWT (GitHub OAuth session) OR API token (hashed SHA-256)
  - Tenant isolation: org_id always extracted from token, never trusted from body

API Token format:
  dg_live_{base62_32_chars}   (production)
  dg_test_{base62_32_chars}   (test/dev — separate validation)

Usage in routers:
    @router.get("/orgs/{org_id}/incidents")
    async def list_incidents(
        org_id: str,
        db: AsyncSession = Depends(get_db),
        principal: Principal = Depends(require_role("org:member")),
    ):
        # principal.org_id is always correct — never trust path param blindly
        if principal.org_id != org_id:
            raise HTTPException(403)
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC
from enum import StrEnum
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db

log = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class Role(StrEnum):
    OWNER = "org:owner"
    ADMIN = "org:admin"
    MEMBER = "org:member"
    VIEWER = "org:viewer"


_ROLE_HIERARCHY = [Role.VIEWER, Role.MEMBER, Role.ADMIN, Role.OWNER]


@dataclass(frozen=True, slots=True)
class Principal:
    """Authenticated identity — always attached to a specific org."""

    user_id: str
    org_id: str
    role: Role
    auth_type: str  # "jwt" | "api_token"
    scopes: frozenset[str] = frozenset()


def _has_role(principal_role: Role, required_role: Role) -> bool:
    """Check if principal_role satisfies required_role (hierarchy-aware)."""
    try:
        p_idx = _ROLE_HIERARCHY.index(principal_role)
        r_idx = _ROLE_HIERARCHY.index(required_role)
        return p_idx >= r_idx
    except ValueError:
        return False


async def _resolve_jwt(token: str, db: AsyncSession) -> Principal | None:
    """
    Resolve a GitHub OAuth JWT token → Principal.
    Token is the `secret_key`-signed JWT from NextAuth.
    """
    from driftguard.core.config import settings

    try:
        import jwt as pyjwt

        payload = pyjwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
        )
        org_id = payload.get("org_id")
        user_id = payload.get("sub") or payload.get("login")
        role = Role(payload.get("role", Role.MEMBER))
        if not org_id or not user_id:
            return None
        return Principal(
            user_id=user_id,
            org_id=org_id,
            role=role,
            auth_type="jwt",
        )
    except Exception as exc:
        log.debug("jwt.resolve.failed", extra={"error": str(exc)})
        return None


async def _resolve_api_token(raw_token: str, db: AsyncSession) -> Principal | None:
    """
    Resolve an API token → Principal.
    Tokens are stored as SHA-256 hashes — never in plaintext.
    """
    if not raw_token.startswith(("dg_live_", "dg_test_")):
        return None

    hashed = hashlib.sha256(raw_token.encode()).hexdigest()

    from driftguard.db.models import APIToken

    stmt = select(APIToken).where(
        APIToken.token_hash == hashed,
        APIToken.revoked == False,  # noqa: E712
    )
    result = await db.execute(stmt)
    token_row = result.scalar_one_or_none()

    if token_row is None:
        return None

    # Update last_used_at in background (fire-and-forget)
    from datetime import datetime

    token_row.last_used_at = datetime.now(UTC)
    # Note: caller commits

    return Principal(
        user_id=str(token_row.id),
        org_id=token_row.org_id,
        role=Role(token_row.role),
        auth_type="api_token",
        scopes=frozenset((token_row.scopes or "").split(",") if token_row.scopes else []),
    )


async def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Principal:
    """Extract principal from Bearer token (JWT or API token)."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    principal: Principal | None = None

    if token.startswith(("dg_live_", "dg_test_")):
        principal = await _resolve_api_token(token, db)
    else:
        principal = await _resolve_jwt(token, db)

    if principal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return principal


def require_role(minimum_role: str | Role) -> type:
    """
    FastAPI dependency factory.
    Returns a dependency that verifies the principal has at least `minimum_role`.

    Usage:
        async def handler(p: Principal = Depends(require_role("org:admin"))): ...
    """
    required = Role(minimum_role)

    async def _dep(
        principal: Principal = Depends(get_current_principal),
    ) -> Principal:
        if not _has_role(principal.role, required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required}' required, got '{principal.role}'",
            )
        return principal

    return _dep


def generate_api_token(prefix: str = "live") -> tuple[str, str]:
    """
    Generate a new API token.
    Returns (plaintext_token, sha256_hash).
    Caller must store ONLY the hash.
    """
    raw = f"dg_{prefix}_{secrets.token_urlsafe(32)}"
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed
