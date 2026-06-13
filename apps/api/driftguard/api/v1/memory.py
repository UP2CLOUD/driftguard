"""Semantic memory API — list + recall."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.api.deps import require_internal_auth
from driftguard.core.db import get_db
from driftguard.db.models import IncidentEmbedding, Organization

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("")
async def list_memory(
    installation_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
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
    if not org:
        return []

    rows = (
        (
            await db.execute(
                select(IncidentEmbedding)
                .where(IncidentEmbedding.org_id == org.id)
                .order_by(IncidentEmbedding.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )

    return [
        {
            "id": r.id,
            "analysis_id": r.analysis_id,
            "repo_full_name": r.repo_full_name,
            "pr_number": r.pr_number,
            "intent_text": r.intent_text[:200] if r.intent_text else None,
            "severity": r.severity,
            "outcome": r.outcome,
            "blast_radius": r.blast_radius,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/stats")
async def memory_stats(
    installation_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> dict:
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
    if not org:
        return {"total": 0, "by_outcome": {}, "by_severity": {}}

    total = (await db.execute(select(func.count()).where(IncidentEmbedding.org_id == org.id))).scalar_one()

    outcome_rows = (
        await db.execute(
            select(IncidentEmbedding.outcome, func.count())
            .where(IncidentEmbedding.org_id == org.id)
            .group_by(IncidentEmbedding.outcome)
        )
    ).all()

    sev_rows = (
        await db.execute(
            select(IncidentEmbedding.severity, func.count())
            .where(IncidentEmbedding.org_id == org.id)
            .group_by(IncidentEmbedding.severity)
        )
    ).all()

    return {
        "total": total,
        "by_outcome": {r[0]: r[1] for r in outcome_rows},
        "by_severity": {r[0]: r[1] for r in sev_rows if r[0]},
    }


class RecallRequest(BaseModel):
    query: str
    top_k: int = 5
    min_similarity: float = 0.75


@router.post("/recall")
async def recall(
    body: RecallRequest,
    installation_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    _auth: str = Depends(require_internal_auth),
) -> list[dict]:
    """Semantic similarity search over incident memory."""
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
    if not org:
        return []

    try:
        from sqlalchemy import text

        from driftguard.services.embeddings import embed, vec_to_pg

        vec = await embed(body.query)
        pg_vec = vec_to_pg(vec)

        rows = (
            (
                await db.execute(
                    text("""
                SELECT id, repo_full_name, pr_number, intent_text, severity, outcome,
                       1 - (embedding_vec <=> :vec::vector) AS similarity
                FROM incident_embeddings
                WHERE org_id = :org_id
                  AND 1 - (embedding_vec <=> :vec::vector) >= :min_sim
                ORDER BY embedding_vec <=> :vec::vector
                LIMIT :k
            """),
                    {"vec": pg_vec, "org_id": org.id, "min_sim": body.min_similarity, "k": body.top_k},
                )
            )
            .mappings()
            .all()
        )

        return [dict(r) for r in rows]
    except Exception as exc:
        # pgvector not available or embedding service down — degrade gracefully
        from driftguard.core.logging import log

        log.warning("recall_unavailable", installation_id=installation_id, error=str(exc))
        return []
