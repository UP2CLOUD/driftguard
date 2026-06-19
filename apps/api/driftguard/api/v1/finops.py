"""FinOps cost-review endpoints."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import FinOpsResourceCost, FinOpsReview

router = APIRouter(prefix="/finops", tags=["finops"])
log = logging.getLogger(__name__)


@router.get("/dashboard")
async def finops_dashboard(
    installation_id: int = Query(..., description="GitHub App installation ID"),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict[str, Any]:
    """Return FinOps summary stats for the dashboard."""
    # Aggregate stats over ALL reviews — not just the recent page
    from sqlalchemy import func as sqlfunc

    agg_stmt = select(
        sqlfunc.count(FinOpsReview.id).label("total"),
        sqlfunc.coalesce(sqlfunc.sum(FinOpsReview.delta_monthly_cents), 0).label("total_delta"),
        sqlfunc.coalesce(sqlfunc.avg(FinOpsReview.delta_monthly_cents), 0).label("avg_delta"),
        sqlfunc.coalesce(sqlfunc.max(FinOpsReview.risk_score), 0).label("highest_risk"),
    ).where(FinOpsReview.installation_id == installation_id)
    agg_result = await db.execute(agg_stmt)
    agg = agg_result.one()

    # Recent 20 reviews for the table display
    stmt = (
        select(FinOpsReview)
        .where(FinOpsReview.installation_id == installation_id)
        .order_by(desc(FinOpsReview.created_at))
        .limit(20)
    )
    result = await db.execute(stmt)
    reviews = result.scalars().all()

    # Provider breakdown from recent reviews only (good enough for display)
    aws_total = gcp_total = azure_total = 0
    for review in reviews:
        costs: dict = review.resource_costs or {}
        for label, cents in costs.items():
            if label.startswith("aws_"):
                aws_total += cents
            elif label.startswith("google_"):
                gcp_total += cents
            elif label.startswith("azurerm_"):
                azure_total += cents

    return {
        "total_reviews": agg.total,
        "total_monthly_delta_cents": int(agg.total_delta),
        "average_monthly_delta_cents": int(agg.avg_delta),
        "highest_risk_score": int(agg.highest_risk),
        "provider_breakdown": {
            "aws": aws_total,
            "gcp": gcp_total,
            "azure": azure_total,
        },
        "recent_reviews": [
            {
                "id": r.id,
                "analysis_id": r.analysis_id,
                "repo_full_name": r.repo_full_name,
                "pr_number": r.pr_number,
                "risk_level": r.risk_level,
                "risk_score": r.risk_score,
                "delta_monthly_cents": r.delta_monthly_cents,
                "delta_annual_cents": r.delta_annual_cents,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "terraform_files": r.terraform_files,
            }
            for r in reviews
        ],
    }


@router.get("/reviews/{review_id}")
async def get_finops_review(
    review_id: str,
    installation_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict[str, Any]:
    """Return full detail for a single FinOps review."""
    review = await db.get(FinOpsReview, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="FinOps review not found")
    if installation_id is not None and review.installation_id != installation_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rc_stmt = (
        select(FinOpsResourceCost)
        .where(FinOpsResourceCost.finops_review_id == review_id)
        .order_by(desc(FinOpsResourceCost.monthly_cents))
    )
    rc_result = await db.execute(rc_stmt)
    resource_costs = rc_result.scalars().all()

    return _review_detail(review, resource_costs)


@router.get("/analyses/{analysis_id}/review")
async def get_finops_review_by_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict[str, Any]:
    """Return the FinOps review associated with a specific analysis."""
    stmt = select(FinOpsReview).where(FinOpsReview.analysis_id == analysis_id)
    result = await db.execute(stmt)
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="No FinOps review for this analysis")

    rc_stmt = (
        select(FinOpsResourceCost)
        .where(FinOpsResourceCost.finops_review_id == review.id)
        .order_by(desc(FinOpsResourceCost.monthly_cents))
    )
    rc_result = await db.execute(rc_stmt)
    resource_costs = rc_result.scalars().all()

    return _review_detail(review, resource_costs)


def _review_detail(review: FinOpsReview, resource_costs: list[FinOpsResourceCost]) -> dict[str, Any]:
    return {
        "id": review.id,
        "analysis_id": review.analysis_id,
        "repo_full_name": review.repo_full_name,
        "pr_number": review.pr_number,
        "risk_level": review.risk_level,
        "risk_score": review.risk_score,
        "current_monthly_cents": review.current_monthly_cents,
        "new_monthly_cents": review.new_monthly_cents,
        "delta_monthly_cents": review.delta_monthly_cents,
        "delta_annual_cents": review.delta_annual_cents,
        "delta_pct": review.delta_pct,
        "terraform_files": review.terraform_files,
        "resource_costs": review.resource_costs,
        "recommendations": review.recommendations,
        "risk_reasons": review.risk_reasons,
        "ai_summary": review.ai_summary,
        "created_at": review.created_at.isoformat() if review.created_at else None,
        "resource_cost_details": [
            {
                "resource_label": rc.resource_label,
                "resource_type": rc.resource_type,
                "provider": rc.provider,
                "change_type": rc.change_type,
                "monthly_cents": rc.monthly_cents,
                "file_path": rc.file_path,
            }
            for rc in resource_costs
        ],
    }
