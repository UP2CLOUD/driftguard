"""Embedding service — sentence-transformers via httpx (no local model in prod).

Uses Anthropic Voyage API for production embeddings.
Falls back to a simple TF-IDF fingerprint for dev/test.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import structlog
from typing import TYPE_CHECKING

import httpx

from driftguard.core.config import settings

if TYPE_CHECKING:
    pass

log = structlog.get_logger(__name__)

EMBED_DIM = 384


async def embed(text: str) -> list[float]:
    """Return a 384-d embedding for text."""
    if settings.anthropic_api_key:
        try:
            return await _voyage_embed(text)
        except Exception as exc:
            log.warning("embed.voyage.failed", error=str(exc))
    return _dev_embed(text)


async def _voyage_embed(text: str) -> list[float]:
    """Voyage-3-lite — cheap, 1024-d, truncated to 384 for our schema."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.voyageai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.anthropic_api_key}"},
            json={"model": "voyage-3-lite", "input": [text[:8192]]},
        )
        resp.raise_for_status()
        vec = resp.json()["data"][0]["embedding"]
        return _truncate_normalize(vec, EMBED_DIM)


def _truncate_normalize(vec: list[float], dim: int) -> list[float]:
    v = vec[:dim]
    norm = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / norm for x in v]


def _dev_embed(text: str) -> list[float]:
    """Deterministic pseudo-embedding for tests/dev — NOT semantically meaningful."""
    tokens = re.findall(r"\w+", text.lower())
    seed = hashlib.sha256(text.encode()).digest()
    rng = list(seed) * (EMBED_DIM // len(seed) + 1)
    vec = [(b / 127.5 - 1.0) for b in rng[:EMBED_DIM]]
    # Bias toward token hash positions
    for i, tok in enumerate(tokens[:20]):
        idx = int(hashlib.md5(tok.encode()).hexdigest(), 16) % EMBED_DIM
        vec[idx] += 0.1
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    return dot  # already normalised


def vec_to_pg(vec: list[float]) -> str:
    """Convert list[float] → Postgres vector literal '[1.0,2.0,...]'."""
    return "[" + ",".join(f"{v:.6f}" for v in vec) + "]"


def intent_text(findings: list[dict], plan_summary: str) -> str:
    """Build a short intent text from PR findings for embedding."""
    parts = [plan_summary[:400]]
    for f in findings[:5]:
        parts.append(f"{f.get('severity','')} {f.get('resource','')} {f.get('message','')}")
    return " ".join(parts)
