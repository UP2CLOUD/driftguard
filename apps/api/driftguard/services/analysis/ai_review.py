"""
AI Review Layer — Phase 5.

Grounds Anthropic Claude strictly on deterministic scanner output.
Never invents resource names, costs, or rule IDs.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from driftguard.core.config import settings
from driftguard.services.scanner.engine import ScanResult, Severity

log = logging.getLogger(__name__)

_SYSTEM = """\
You are DriftGuard's AI review layer.
You receive deterministic scanner output (IaC findings already computed by
static analysis rules). Your job: produce a high-signal, grounded narrative.

Hard rules:
- NEVER invent resource names, file paths, rule IDs, or cost numbers.
- ONLY reference what appears in the provided findings JSON.
- If findings is empty, respond with: "✓ No findings. IaC looks clean."
- Markdown only. No preamble. No sign-off. No emojis beyond ✓ ✗ ⚠.
- Maximum 400 tokens. Be concise.
- Prioritize: CRITICAL first, then HIGH, MEDIUM, LOW.
- For each critical/high: one sentence + one code fix.

Output structure:
## Summary
[1-2 sentences: overall risk + key concerns]

## Critical / High priority
[Findings needing immediate attention, with fix]

## Medium / Low priority
[Briefer treatment]

## Remediation checklist
- [ ] Fix 1
(max 5 items)
"""


@dataclass
class AIReview:
    narrative: str
    model: str
    input_tokens: int
    output_tokens: int
    cached: bool = False
    skipped: bool = False


def _build_prompt(result: ScanResult, context: dict[str, Any]) -> str:
    findings_data = [
        {
            "rule_id": f.rule_id,
            "severity": str(f.severity.value),
            "category": str(f.category.value),
            "title": f.title,
            "file": f.file,
            "line": f.line,
            "resource": f.resource,
            "suggestion": f.suggestion,
        }
        for f in result.findings
    ]
    return (
        f"Repository: {context.get('repo', 'unknown')}\n"
        f"Ref: {context.get('ref', 'HEAD')}\n"
        f"Files scanned: {result.files_scanned} "
        f"({result.tf_files} TF, {result.k8s_files} K8s, {result.gha_files} GHA)\n"
        f"Risk score: {result.risk_score}/100\n\n"
        f"Findings ({len(result.findings)} total):\n"
        f"```json\n{json.dumps(findings_data, indent=2)}\n```"
    )


def _static_fallback(result: ScanResult) -> AIReview:
    """Deterministic summary when Anthropic unavailable — no invented content."""
    lines = [
        f"## Summary\nRisk score **{result.risk_score}/100**. "
        f"{len(result.findings)} finding(s) across {result.files_scanned} file(s).\n"
    ]
    critical = [f for f in result.findings if f.severity == Severity.CRITICAL]
    high = [f for f in result.findings if f.severity == Severity.HIGH]
    rest = [f for f in result.findings if f.severity in (Severity.MEDIUM, Severity.LOW)]

    if critical or high:
        lines.append("## Critical / High priority")
        for f in (critical + high)[:5]:
            lines.append(f"- **{f.rule_id}** `{f.resource or f.file}` — {f.title}")
            if f.suggestion:
                lines.append(f"  > Fix: {f.suggestion}")

    if rest:
        lines.append("\n## Medium / Low priority")
        for f in rest[:3]:
            lines.append(f"- **{f.rule_id}** — {f.title}")

    lines.append("\n## Remediation checklist")
    for f in result.findings[:5]:
        lines.append(f"- [ ] {f.suggestion or f.title}")

    return AIReview(
        narrative="\n".join(lines),
        model="static-fallback",
        input_tokens=0,
        output_tokens=0,
    )


async def run_ai_review(
    result: ScanResult,
    context: dict[str, Any] | None = None,
) -> AIReview:
    """Run AI review on a ScanResult. Degrades gracefully without API key."""
    if not getattr(settings, "anthropic_api_key", None):
        return AIReview(
            narrative="*AI review unavailable — ANTHROPIC_API_KEY not configured.*",
            model="none",
            input_tokens=0,
            output_tokens=0,
            skipped=True,
        )

    if not result.findings:
        return AIReview(
            narrative="✓ No findings. IaC looks clean.",
            model="static",
            input_tokens=0,
            output_tokens=0,
            skipped=True,
        )

    ctx = context or {}
    prompt = _build_prompt(result, ctx)

    try:
        from anthropic import AsyncAnthropic

        ai = AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await ai.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        narrative = response.content[0].text if response.content else ""
        return AIReview(
            narrative=narrative,
            model=response.model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
    except Exception as exc:
        log.warning("ai_review.failed", extra={"error": str(exc)})
        return _static_fallback(result)
