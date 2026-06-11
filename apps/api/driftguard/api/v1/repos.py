from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.db.models import Organization, Repository
from driftguard.services.quota import assert_can_enable_repo

router = APIRouter()


class RepoPatch(BaseModel):
    enabled: bool | None = None


@router.get("")
async def list_repos(
    installation_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    if installation_id is not None:
        # Return all repos (enabled + disabled) for the given org.
        org_result = await db.execute(
            select(Organization).where(Organization.github_installation_id == installation_id)
        )
        org = org_result.scalar_one_or_none()
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
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")

    if body.enabled is not None:
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
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")
    if repo.enabled:
        return {"id": repo.id, "enabled": True}

    org = await db.get(Organization, repo.org_id)
    if org is None:
        raise HTTPException(404, "Organization not found")

    try:
        await assert_can_enable_repo(db, org)
    except ValueError as exc:
        raise HTTPException(402, str(exc)) from exc

    repo.enabled = True
    await db.commit()
    log.info("repo_enabled", repo_id=repo_id, org_id=org.id)
    return {"id": repo.id, "enabled": True}


@router.post("/{repo_id}/disable")
async def disable_repo(
    repo_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if repo is None:
        raise HTTPException(404, "Repository not found")

    repo.enabled = False
    await db.commit()
    log.info("repo_disabled", repo_id=repo_id)
    return {"id": repo.id, "enabled": False}
