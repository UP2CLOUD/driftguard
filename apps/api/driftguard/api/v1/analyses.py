from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Finding, PullRequest, Repository

router = APIRouter()


@router.get("")
async def list_analyses(
    repo_id: str | None = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    stmt = (
        select(Analysis, PullRequest, Repository)
        .join(PullRequest, Analysis.pr_id == PullRequest.id)
        .join(Repository, PullRequest.repo_id == Repository.id)
        .order_by(desc(Analysis.id))
        .limit(min(limit, 100))
    )
    if repo_id:
        stmt = stmt.where(Repository.id == repo_id)

    result = await db.execute(stmt)
    return [
        {
            "id": a.id,
            "status": a.status,
            "risk_score": a.risk_score,
            "cost_delta_cents": a.cost_delta_cents,
            "pr_number": p.github_pr_number,
            "head_sha": p.head_sha,
            "repo_full_name": r.full_name,
            "created_at": a.started_at.isoformat() if a.started_at else None,
        }
        for a, p, r in result.all()
    ]


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
    a = await db.get(Analysis, analysis_id)
    if not a:
        raise HTTPException(404)

    pr = await db.get(PullRequest, a.pr_id) if a.pr_id else None
    repo = await db.get(Repository, pr.repo_id) if pr else None

    findings_rows = (await db.execute(select(Finding).where(Finding.analysis_id == analysis_id))).scalars().all()

    return {
        "id": a.id,
        "status": a.status,
        "cost_delta_cents": a.cost_delta_cents,
        "risk_score": a.risk_score,
        "summary_md": a.summary_md,
        "repo_full_name": repo.full_name if repo else None,
        "pr_number": pr.github_pr_number if pr else None,
        "head_sha": pr.head_sha if pr else None,
        "started_at": a.started_at.isoformat() if a.started_at else None,
        "finished_at": a.finished_at.isoformat() if a.finished_at else None,
        "findings": [
            {
                "type": f.type,
                "severity": f.severity,
                "resource": f.resource_address,
                "message": f.message,
                "suggestion": f.suggestion,
            }
            for f in findings_rows
        ],
    }
