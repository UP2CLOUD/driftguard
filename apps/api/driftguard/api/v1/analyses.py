from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.db.models import Analysis, Finding

router = APIRouter()


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: str, db: AsyncSession = Depends(get_db)) -> dict:
    a = await db.get(Analysis, analysis_id)
    if not a:
        raise HTTPException(404)
    findings = await db.execute(select(Finding).where(Finding.analysis_id == analysis_id))
    return {
        "id": a.id,
        "status": a.status,
        "cost_delta_cents": a.cost_delta_cents,
        "risk_score": a.risk_score,
        "summary_md": a.summary_md,
        "findings": [
            {
                "type": f.type,
                "severity": f.severity,
                "resource": f.resource_address,
                "message": f.message,
                "suggestion": f.suggestion,
            }
            for f in findings.scalars()
        ],
    }
