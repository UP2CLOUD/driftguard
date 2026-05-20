"""Semantic memory recall endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from driftguard.core.auth import verify_api_key
from driftguard.core.db import SessionLocal
from driftguard.services.embeddings import embed, vec_to_pg

router = APIRouter(prefix="/memory", tags=["memory"])


class RecallRequest(BaseModel):
    project: str
    intent: str = Field(..., min_length=4, max_length=4096)
    top_k: int = Field(default=5, ge=1, le=20)


class RecallMatch(BaseModel):
    id: str
    similarity: float
    date: str
    summary: str
    resource: str | None
    severity: str | None
    outcome: str | None


class RecallResponse(BaseModel):
    matches: list[RecallMatch]
    latency_ms: int


@router.post("/recall", response_model=RecallResponse)
async def recall(body: RecallRequest, _: None = Depends(verify_api_key)):
    import time
    t0 = time.monotonic()

    vec = await embed(body.intent)
    pg_vec = vec_to_pg(vec)

    async with SessionLocal() as session:
        # cosine similarity search via pgvector <=> operator
        rows = (
            await session.execute(
                text("""
                    SELECT
                        id,
                        analysis_id,
                        repo_full_name,
                        pr_number,
                        intent_text,
                        severity,
                        outcome,
                        created_at,
                        1 - (embedding_vec <=> :vec) AS similarity
                    FROM incident_embeddings
                    WHERE 1 - (embedding_vec <=> :vec) >= 0.5
                    ORDER BY similarity DESC
                    LIMIT :k
                """),
                {"vec": pg_vec, "k": body.top_k},
            )
        ).fetchall()

    latency_ms = int((time.monotonic() - t0) * 1000)

    matches = [
        RecallMatch(
            id=row.analysis_id or row.id,
            similarity=round(float(row.similarity), 4),
            date=row.created_at.date().isoformat() if row.created_at else "",
            summary=row.intent_text[:200] if row.intent_text else "",
            resource=row.repo_full_name,
            severity=row.severity,
            outcome=row.outcome,
        )
        for row in rows
    ]

    return RecallResponse(matches=matches, latency_ms=latency_ms)
