"""API token management endpoints."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import APIToken
from driftguard.middleware.rbac import Principal, generate_api_token, require_role

router = APIRouter(prefix="/tokens", tags=["tokens"])


class TokenCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    role: str = "org:member"
    scopes: list[str] = Field(default_factory=list)
    expires_at: datetime | None = None


class TokenCreateResponse(BaseModel):
    """ONLY returned once — token never shown again."""

    id: str
    name: str
    token: str  # plaintext — shown ONCE
    role: str
    expires_at: datetime | None


class TokenListItem(BaseModel):
    id: str
    name: str
    role: str
    scopes: str | None
    revoked: bool
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime


@router.post("", response_model=TokenCreateResponse, status_code=201)
async def create_token(
    body: TokenCreateRequest,
    db: AsyncSession = Depends(get_db),
    principal: Principal = Depends(require_role("org:admin")),
) -> TokenCreateResponse:
    """Create a new API token. The plaintext is returned exactly once."""
    allowed_roles = {"org:viewer", "org:member", "org:admin"}
    if body.role not in allowed_roles:
        raise HTTPException(400, f"Role must be one of: {sorted(allowed_roles)}")

    plaintext, token_hash = generate_api_token("live")

    token = APIToken(
        org_id=principal.org_id,
        name=body.name,
        token_hash=token_hash,
        role=body.role,
        scopes=",".join(body.scopes) if body.scopes else None,
        expires_at=body.expires_at,
        created_by=principal.user_id,
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)

    return TokenCreateResponse(
        id=token.id,
        name=token.name,
        token=plaintext,
        role=token.role,
        expires_at=token.expires_at,
    )


@router.get("", response_model=list[TokenListItem])
async def list_tokens(
    db: AsyncSession = Depends(get_db),
    principal: Principal = Depends(require_role("org:admin")),
) -> list[TokenListItem]:
    result = await db.execute(
        select(APIToken)
        .where(APIToken.org_id == principal.org_id, APIToken.revoked == False)  # noqa: E712
        .order_by(APIToken.created_at.desc())
    )
    tokens = result.scalars().all()
    return [
        TokenListItem(
            id=t.id,
            name=t.name,
            role=t.role,
            scopes=t.scopes,
            revoked=t.revoked,
            last_used_at=t.last_used_at,
            expires_at=t.expires_at,
            created_at=t.created_at,
        )
        for t in tokens
    ]


@router.delete("/{token_id}", status_code=204)
async def revoke_token(
    token_id: str,
    db: AsyncSession = Depends(get_db),
    principal: Principal = Depends(require_role("org:admin")),
) -> None:
    result = await db.execute(
        select(APIToken).where(
            APIToken.id == token_id,
            APIToken.org_id == principal.org_id,
        )
    )
    token = result.scalar_one_or_none()
    if token is None:
        raise HTTPException(404, "Token not found")
    token.revoked = True
    await db.commit()
