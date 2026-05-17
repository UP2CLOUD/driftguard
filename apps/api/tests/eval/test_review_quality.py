"""AI review eval suite.

Runs against real Claude API. Skipped by default to avoid cost in CI.
Enable: DRIFTGUARD_RUN_EVAL=1 ANTHROPIC_API_KEY=... uv run pytest tests/eval -v

Invariants enforced (cheap, deterministic):
- Output is non-empty markdown
- Required phrases appear (typically resource addresses and exact cost numbers)
- Forbidden phrases absent (no hallucinated framework codes when nothing maps)
- No invented resource names from a deny-list

A failing eval blocks deploy (when wired into a separate workflow).
"""

import json
import os
from pathlib import Path

import pytest

from driftguard.ai.findings import Finding
from driftguard.ai.reviewer import review

CASES_DIR = Path(__file__).parent / "cases"
RUN_EVAL = os.getenv("DRIFTGUARD_RUN_EVAL") == "1"

pytestmark = pytest.mark.skipif(not RUN_EVAL, reason="eval suite disabled; set DRIFTGUARD_RUN_EVAL=1")


def _load_cases() -> list[dict]:
    return sorted(
        (json.loads(p.read_text()) for p in CASES_DIR.glob("*.json")),
        key=lambda c: c["name"],
    )


def _to_findings(data: list[dict]) -> list[Finding]:
    out = []
    for d in data:
        out.append(
            Finding(
                type=d["type"],
                severity=d["severity"],
                resource=d["resource"],
                message=d["message"],
                suggestion=d.get("suggestion"),
                rule_id=d.get("rule_id"),
                controls=tuple(d.get("controls", [])),
                extra=d.get("extra", {}),
            )
        )
    return out


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["name"])
@pytest.mark.asyncio
async def test_review_invariants(case: dict):
    findings = _to_findings(case["findings"])
    pr_ctx = case["pr_context"]

    md = await review(findings, pr_ctx)
    md_norm = md.lower()

    assert md and "##" in md, f"output not markdown: {md!r}"

    exp = case["expectations"]
    for phrase in exp.get("must_contain_phrases", []):
        assert phrase.lower() in md_norm, f"missing required phrase {phrase!r}"

    any_of = exp.get("must_contain_any_of", [])
    if any_of:
        assert any(p.lower() in md_norm for p in any_of), f"none of {any_of} present"

    for phrase in exp.get("must_not_contain_phrases", []):
        assert phrase.lower() not in md_norm, f"forbidden phrase {phrase!r} present"

    for fake in exp.get("must_not_invent_resources", []):
        assert fake.lower() not in md_norm, f"invented resource {fake!r} present"
