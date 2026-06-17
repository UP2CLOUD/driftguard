from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .estimators.dispatcher import estimate_cost
from .parsers.terraform_diff import ResourceChange, parse_terraform_files
from .recommendations.rules import Recommendation
from .recommendations.rules import generate as gen_recommendations
from .scoring.risk import score as compute_risk

log = logging.getLogger(__name__)


@dataclass
class FinOpsResult:
    resource_changes: list[ResourceChange] = field(default_factory=list)
    resource_costs: dict[str, int] = field(default_factory=dict)  # label → monthly cents
    current_monthly_cents: int = 0
    new_monthly_cents: int = 0
    delta_monthly_cents: int = 0
    delta_annual_cents: int = 0
    delta_pct: float = 0.0
    risk_level: str = "LOW"
    risk_score: int = 0
    risk_reasons: list[str] = field(default_factory=list)
    recommendations: list[Recommendation] = field(default_factory=list)
    ai_summary: str | None = None
    has_terraform: bool = False
    terraform_files: list[str] = field(default_factory=list)


def run_finops_analysis(
    file_contents: dict[str, str],
    ai_summary: str | None = None,
) -> FinOpsResult:
    """
    Main entry point. file_contents maps path → content for all files in the PR.
    Returns a FinOpsResult with cost estimates, risk, and recommendations.
    """
    result = FinOpsResult()

    tf_files = {p: c for p, c in file_contents.items() if p.endswith((".tf", ".tfvars"))}
    if not tf_files:
        return result

    result.has_terraform = True
    result.terraform_files = list(tf_files.keys())

    try:
        changes = parse_terraform_files(tf_files)
    except Exception:
        log.exception("Terraform parser error")
        return result

    result.resource_changes = changes

    # Estimate costs per resource
    for rc in changes:
        cents = estimate_cost(rc)
        if cents > 0:
            result.resource_costs[rc.label] = cents

    # Total new monthly cost (treating all parsed resources as new)
    result.new_monthly_cents = sum(result.resource_costs.values())
    result.current_monthly_cents = 0  # diff-based: we show cost of what's added
    result.delta_monthly_cents = result.new_monthly_cents - result.current_monthly_cents
    result.delta_annual_cents = result.delta_monthly_cents * 12

    if result.current_monthly_cents > 0:
        result.delta_pct = (result.delta_monthly_cents / result.current_monthly_cents) * 100

    # Risk scoring
    risk = compute_risk(changes, result.delta_monthly_cents, result.resource_costs)
    result.risk_level = risk.level
    result.risk_score = risk.score
    result.risk_reasons = risk.reasons

    # Recommendations
    all_recs: list[Recommendation] = []
    for rc in changes:
        cents = result.resource_costs.get(rc.label, 0)
        all_recs.extend(gen_recommendations(rc, cents))
    # Deduplicate by title
    seen: set[str] = set()
    for rec in all_recs:
        if rec.title not in seen:
            result.recommendations.append(rec)
            seen.add(rec.title)

    result.ai_summary = ai_summary
    return result
