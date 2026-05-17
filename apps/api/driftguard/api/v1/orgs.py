from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Organization, PullRequest, Repository

router = APIRouter()


@router.get("/by-installation/{installation_id}")
async def get_org_by_installation(installation_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(404, "org not found")
    return {
        "id": org.id,
        "installation_id": org.github_installation_id,
        "plan": org.plan,
        "has_stripe_customer": org.stripe_customer_id is not None,
    }


@router.get("/{org_id}/repos")
async def list_org_repos(org_id: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(Repository).where(Repository.org_id == org_id).order_by(Repository.full_name))
    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "default_branch": r.default_branch,
            "enabled": r.enabled,
        }
        for r in result.scalars()
    ]


@router.get("/{org_id}/analyses")
async def list_org_analyses(org_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)) -> list[dict]:
    stmt = (
        select(Analysis, PullRequest, Repository)
        .join(PullRequest, Analysis.pr_id == PullRequest.id)
        .join(Repository, PullRequest.repo_id == Repository.id)
        .where(Repository.org_id == org_id)
        .order_by(desc(Analysis.id))
        .limit(min(limit, 100))
    )
    result = await db.execute(stmt)
    return [
        {
            "id": a.id,
            "status": a.status,
            "cost_delta_cents": a.cost_delta_cents,
            "risk_score": a.risk_score,
            "pr_number": p.github_pr_number,
            "head_sha": p.head_sha,
            "repo": r.full_name,
        }
        for a, p, r in result.all()
    ]
