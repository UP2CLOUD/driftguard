from fastapi import APIRouter, Depends
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
