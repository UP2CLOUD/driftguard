from __future__ import annotations
from ..engine import FinOpsResult

MARKER = "<!-- driftguard-finops-review -->"

_RISK_BADGE = {
    "LOW": "🟢 LOW",
    "MEDIUM": "🟡 MEDIUM",
    "HIGH": "🟠 HIGH",
    "CRITICAL": "🔴 CRITICAL",
}


def _fmt_cents(cents: int) -> str:
    if cents == 0:
        return "$0"
    sign = "+" if cents > 0 else ""
    return f"{sign}${abs(cents) / 100:.2f}"


def render_comment(result: FinOpsResult) -> str:
    lines: list[str] = [
        MARKER,
        "",
        "## DriftGuard FinOps Review",
        "",
        "### Estimated Monthly Cost Impact",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Current Cost | ${result.current_monthly_cents / 100:.2f} |",
        f"| New Cost | ${result.new_monthly_cents / 100:.2f} |",
        f"| Monthly Difference | {_fmt_cents(result.delta_monthly_cents)} |",
        f"| Annual Impact | {_fmt_cents(result.delta_annual_cents)} |",
        "",
        f"### Risk Level: {_RISK_BADGE.get(result.risk_level, result.risk_level)}",
        "",
    ]

    if result.resource_costs:
        lines += [
            "### Top Cost Drivers",
            "",
            "| Resource | Monthly Impact |",
            "|----------|---------------|",
        ]
        top = sorted(result.resource_costs.items(), key=lambda x: x[1], reverse=True)[:8]
        for label, cents in top:
            lines.append(f"| `{label}` | {_fmt_cents(cents)} |")
        lines.append("")

    if result.recommendations:
        lines += ["### Recommendations", ""]
        for rec in result.recommendations[:6]:
            lines.append(f"- **{rec.title}**: {rec.detail}")
        lines.append("")

    if result.ai_summary:
        lines += [
            "### AI FinOps Summary",
            "",
            result.ai_summary,
            "",
        ]

    if result.risk_reasons:
        lines += [
            "<details>",
            "<summary>Risk Score Details</summary>",
            "",
        ]
        for reason in result.risk_reasons:
            lines.append(f"- {reason}")
        lines += ["", "</details>", ""]

    lines += [
        "---",
        "*Costs are estimates based on published list prices. Actual cloud billing may vary.*  ",
        "*[DriftGuard FinOps](https://driftguard.dev)*",
    ]
    return "\n".join(lines)
