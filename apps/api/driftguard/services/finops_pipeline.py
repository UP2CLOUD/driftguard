from __future__ import annotations
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from ..services.finops.engine import FinOpsResult
from ..db.models import Analysis

log = logging.getLogger(__name__)


async def persist_finops_result(
    db: AsyncSession,
    analysis_id: str,
    result: FinOpsResult,
) -> None:
    """Store FinOps summary data on the Analysis record."""
    try:
        analysis = await db.get(Analysis, analysis_id)
        if analysis is None:
            return
        if result.delta_monthly_cents != 0:
            analysis.cost_delta_cents = result.delta_monthly_cents
        if result.risk_score > 0 and analysis.risk_score is None:
            analysis.risk_score = result.risk_score
        await db.flush()
    except Exception:
        log.exception("Failed to persist FinOps result for analysis %s", analysis_id)
