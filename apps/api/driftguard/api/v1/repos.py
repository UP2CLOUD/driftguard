from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.db.models import AuditLog, Organization, Repository
from driftguard.services.quota import assert_can_enable_repo

router = APIRouter()


class RepoPatch(BaseModel):
    enabled: bool | None = None


async def _assert_repo_belongs_to_installation(
    db: AsyncSession, org: Organization, installation_id: int | None
) -> None:
    """When the caller supplies installation_id, verify it matches the repo's org.

    require_internal_auth only proves "this is our own web app calling" — a
    single shared secret with no per-end-user identity, since the FastAPI
    backend never sees who's logged in. The Next.js layer is what actually
    knows the calling user (via their NextAuth session) and is responsible
    for verifying that user is authorized for `installation_id` before it
    ever proxies here (see apps/web/lib/auth-utils.ts checkInstallationAccess).
    This check closes the other half of the gap: even a caller legitimately
    authorized for *some* installation could otherwise pass any repo_id
    belonging to a *different* org and this endpoint would happily act on
    it, since repo_id alone carries no ownership proof. Skipped (fail open)
    only when the caller omits installation_id, to stay compatible with any
    other internal caller that doesn't have it — new web-layer call sites
    should always send it.
    """
    if installation_id is None:
        return
    if org.github_installation_id != installation_id:
        raise HTTPException(403, "Repository does not belong to this installation")


@router.get("")
async def list_repos(
    installation_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    if installation_id is not None:
        # Return all repos (enabled + disabled) for the given org.
        org = (
            (
                await db.execute(
                    select(Organization)
                    .where(Organization.github_installation_id == installation_id)
                    .order_by(Organization.created_at.desc())
                )
            )
            .scalars()
            .first()
        )
        if org is None:
            return []
        result = await db.execute(select(Repository).where(Repository.org_id == org.id))
    else:
        result = await db.execute(select(Repository).where(Repository.enabled.is_(True)))

    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "default_branch": r.default_branch,
            "enabled": r.enabled,
        }
        for r in result.scalars()
    ]


@router.patch("/{repo_id}")
async def patch_repo(
    repo_id: str,
    body: RepoPatch,
    installation_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")

    org = await db.get(Organization, repo.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")
    await _assert_repo_belongs_to_installation(db, org, installation_id)

    if body.enabled is not None:
        if body.enabled and not repo.enabled:
            try:
                await assert_can_enable_repo(db, org)
            except ValueError as exc:
                raise HTTPException(402, str(exc)) from exc
        if repo.enabled != body.enabled:
            action = "repo.enabled" if body.enabled else "repo.disabled"
            db.add(
                AuditLog(
                    org_id=repo.org_id,
                    actor="api",
                    action=action,
                    target=repo_id,
                    payload={"full_name": repo.full_name},
                )
            )
        repo.enabled = body.enabled

    await db.commit()
    return {
        "id": repo.id,
        "full_name": repo.full_name,
        "default_branch": repo.default_branch,
        "enabled": repo.enabled,
    }


@router.post("/{repo_id}/enable")
async def enable_repo(
    repo_id: str,
    installation_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")

    org = await db.get(Organization, repo.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")
    await _assert_repo_belongs_to_installation(db, org, installation_id)

    if repo.enabled:
        return {"id": repo.id, "enabled": True}

    try:
        await assert_can_enable_repo(db, org)
    except ValueError as exc:
        raise HTTPException(402, str(exc)) from exc

    repo.enabled = True
    db.add(
        AuditLog(
            org_id=org.id,
            actor="api",
            action="repo.enabled",
            target=repo_id,
            payload={"full_name": repo.full_name},
        )
    )
    await db.commit()
    log.info("repo_enabled", repo_id=repo_id, org_id=org.id)
    return {"id": repo.id, "enabled": True}


@router.post("/{repo_id}/disable")
async def disable_repo(
    repo_id: str,
    installation_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")

    org = await db.get(Organization, repo.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")
    await _assert_repo_belongs_to_installation(db, org, installation_id)

    repo.enabled = False
    db.add(
        AuditLog(
            org_id=repo.org_id,
            actor="api",
            action="repo.disabled",
            target=repo_id,
            payload={"full_name": repo.full_name},
        )
    )
    await db.commit()
    log.info("repo_disabled", repo_id=repo_id)
    return {"id": repo.id, "enabled": False}
