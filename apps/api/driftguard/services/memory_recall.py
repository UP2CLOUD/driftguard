"""Semantic memory recall — find similar past incidents for a PR.

Architecture step 02: embed current findings, query IncidentEmbeddings,
cite the top matches in the PR comment.

Falls back to text-based matching when pgvector not available.
"""

from __future__ import annotations

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.ai.findings import Finding
from driftguard.db.models import IncidentEmbedding, Organization
from driftguard.services.embeddings import cosine_similarity, embed, intent_text, vec_to_pg

log = structlog.get_logger(__name__)

_RECALL_LIMIT = 3
_SIMILARITY_THRESHOLD = 0.75


def _build_intent(findings: list[Finding]) -> str:
    dicts = [{"severity": f.severity, "resource": f.resource, "message": f.message} for f in findings[:10]]
    return intent_text(dicts, plan_summary="")


async def store_memory(
    db: AsyncSession,
    *,
    org_id: str,
    analysis_id: str,
    repo_full_name: str,
    pr_number: int,
    findings: list[Finding],
    outcome: str,  # "approved" | "blocked" | "warned"
    risk_score: int,
) -> None:
    """Persist analysis as a memory entry for future recall."""
    if not findings:
        return

    text_repr = _build_intent(findings)
    severity = findings[0].severity if findings else "low"

    row = IncidentEmbedding(
        org_id=org_id,
        analysis_id=analysis_id,
        repo_full_name=repo_full_name,
        pr_number=pr_number,
        intent_text=text_repr[:2000],
        severity=severity,
        outcome=outcome,
        blast_radius="high" if risk_score >= 70 else "medium" if risk_score >= 40 else "low",
    )
    db.add(row)

    # Store embedding vector if pgvector available
    try:
        vec = await embed(text_repr)
        await db.flush()
        await db.execute(
            text("UPDATE incident_embeddings SET embedding_vec = :v WHERE id = :id"),
            {"v": vec_to_pg(vec), "id": row.id},
        )
    except Exception as exc:
        log.warning("memory.embed_failed", error=str(exc))

    await db.commit()
    log.info("memory.stored", repo=repo_full_name, pr=pr_number, outcome=outcome)


async def recall_similar(
    db: AsyncSession,
    *,
    installation_id: int,
    findings: list[Finding],
    exclude_repo: str | None = None,
) -> list[dict]:
    """Return up to 3 similar past incidents with similarity score."""
    if not findings:
        return []

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

    text_repr = _build_intent(findings)

    # Try pgvector cosine search first
    try:
        vec = await embed(text_repr)
        vec_literal = vec_to_pg(vec)
        rows = await db.execute(
            text(
                """
                SELECT id, repo_full_name, pr_number, intent_text, severity, outcome, blast_radius,
                       1 - (embedding_vec <=> :vec::vector) AS similarity
                FROM incident_embeddings
                WHERE org_id = :org_id
                  AND embedding_vec IS NOT NULL
                  AND (:exclude IS NULL OR repo_full_name != :exclude)
                ORDER BY embedding_vec <=> :vec::vector
                LIMIT :lim
                """
            ),
            {"vec": vec_literal, "org_id": org.id, "exclude": exclude_repo, "lim": _RECALL_LIMIT},
        )
        results = rows.mappings().all()
        if results:
            return [
                {
                    "repo": r["repo_full_name"],
                    "pr": r["pr_number"],
                    "similarity": round(float(r["similarity"]), 2),
                    "outcome": r["outcome"],
                    "severity": r["severity"],
                    "summary": (r["intent_text"] or "")[:200],
                }
                for r in results
                if float(r["similarity"]) >= _SIMILARITY_THRESHOLD
            ]
    except Exception as exc:
        log.warning("memory.pgvector_failed", error=str(exc))

    # Fallback: text-based — find entries with matching severity + outcome
    try:
        severity_set = {f.severity for f in findings}
        stmt = (
            select(IncidentEmbedding)
            .where(
                IncidentEmbedding.org_id == org.id,
                IncidentEmbedding.severity.in_(severity_set),
            )
            .order_by(IncidentEmbedding.created_at.desc())
            .limit(10)
        )
        if exclude_repo:
            stmt = stmt.where(IncidentEmbedding.repo_full_name != exclude_repo)
        rows_orm = (await db.execute(stmt)).scalars().all()

        # Local cosine sim on dev embeddings
        query_vec = await embed(text_repr)
        scored = []
        for r in rows_orm:
            if not r.intent_text:
                continue
            r_vec = await embed(r.intent_text)
            sim = cosine_similarity(query_vec, r_vec)
            if sim >= _SIMILARITY_THRESHOLD:
                scored.append((sim, r))

        scored.sort(reverse=True)
        return [
            {
                "repo": r.repo_full_name,
                "pr": r.pr_number,
                "similarity": round(sim, 2),
                "outcome": r.outcome,
                "severity": r.severity,
                "summary": (r.intent_text or "")[:200],
            }
            for sim, r in scored[:_RECALL_LIMIT]
        ]
    except Exception as exc:
        log.warning("memory.recall_fallback_failed", error=str(exc))
        return []


def format_recall_section(recalls: list[dict]) -> str:
    """Format recall results as a markdown section for PR comment."""
    if not recalls:
        return ""
    lines = ["\n<details><summary>🧠 Similar past incidents</summary>\n"]
    for r in recalls:
        outcome_icon = {"approved": "🟢", "blocked": "🔴", "warned": "🟠"}.get(r.get("outcome", ""), "⚪")
        lines.append(
            f"- {outcome_icon} **{r['repo']}#{r['pr']}** — similarity {r['similarity']:.0%}"
            f" · {r.get('severity', '?')} · {r.get('outcome', '?')}"
        )
        if r.get("summary"):
            lines.append(f"  > _{r['summary'][:120]}_")
    lines.append("\n</details>\n")
    return "\n".join(lines)
