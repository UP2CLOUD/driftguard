from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import Repository

router = APIRouter()


@router.get("")
async def list_repos(
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    result = await db.execute(select(Repository).where(Repository.enabled.is_(True)))
    return [{"id": r.id, "full_name": r.full_name, "default_branch": r.default_branch} for r in result.scalars()]


class RepoPatch(BaseModel):
    enabled: bool | None = None


@router.patch("/{repo_id}")
async def patch_repo(
    repo_id: str,
    body: RepoPatch,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    repo = await db.get(Repository, repo_id)
    if not repo:
        raise HTTPException(404, "Repository not found")
    if body.enabled is not None:
        repo.enabled = body.enabled
    await db.commit()
    return {"id": repo.id, "full_name": repo.full_name, "default_branch": repo.default_branch, "enabled": repo.enabled}
