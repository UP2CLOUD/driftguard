from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Finding, PullRequest, Repository

router = APIRouter()


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    a = await db.get(Analysis, analysis_id)
    if not a:
        raise HTTPException(404)

    # Join PR + repo for metadata the frontend needs
    pr = await db.get(PullRequest, a.pr_id) if a.pr_id else None
    repo = await db.get(Repository, pr.repo_id) if pr else None

    findings_rows = (await db.execute(select(Finding).where(Finding.analysis_id == analysis_id))).scalars().all()

    return {
        "id": a.id,
        "status": a.status,
        "cost_delta_cents": a.cost_delta_cents,
        "risk_score": a.risk_score,
        "summary_md": a.summary_md,
        # PR metadata
        "repo_full_name": repo.full_name if repo else None,
        "pr_number": pr.github_pr_number if pr else None,
        "head_sha": pr.head_sha if pr else None,
        "started_at": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
        "finished_at": a.updated_at.isoformat() if getattr(a, "updated_at", None) else None,
        "findings": [
            {
                "type": f.type,
                "severity": f.severity,
                "resource": f.resource,
                "message": f.message,
                "suggestion": f.suggestion,
            }
            for f in findings_rows
        ],
    }
