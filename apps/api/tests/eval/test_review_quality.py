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
from driftguard.ai.reviewer import _static_fallback, review

CASES_DIR = Path(__file__).parent / "cases"
RUN_EVAL = os.getenv("DRIFTGUARD_RUN_EVAL") == "1"
# review() tries Anthropic, then Gemini, then a deterministic static
# fallback. Gating on ANTHROPIC_API_KEY alone meant that with only
# GEMINI_API_KEY configured -- the current setup, since Gemini is primary --
# eval-suite.yml's gate passed and reported "✓ Eval suite completed" while
# every test in this module silently skipped.
HAS_API_KEY = bool(os.getenv("ANTHROPIC_API_KEY", "").strip() or os.getenv("GEMINI_API_KEY", "").strip())

pytestmark = pytest.mark.skipif(
    not RUN_EVAL or not HAS_API_KEY,
    reason="eval suite disabled — set DRIFTGUARD_RUN_EVAL=1 and ANTHROPIC_API_KEY or GEMINI_API_KEY",
)


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

    # If every provider failed, review() returns the deterministic static
    # summary. Asserting quality expectations against it produces confusing
    # "missing required phrase" failures that read as model regressions --
    # this is how a billing outage once looked like a quality problem. Fail
    # with the real cause instead.
    if md == _static_fallback(findings):
        pytest.fail(
            "review() fell back to the deterministic static summary — every LLM "
            "provider failed (bad/expired key, billing, or network). This is an "
            "availability failure, not a review-quality regression."
        )

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
