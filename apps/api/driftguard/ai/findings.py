from dataclasses import dataclass, field
from typing import Literal

Severity = Literal["info", "low", "medium", "high", "critical"]
FindingType = Literal["cost", "drift", "security", "policy", "change"]


@dataclass
class Finding:
    type: FindingType
    severity: Severity
    resource: str
    message: str
    suggestion: str | None = None
    rule_id: str | None = None
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "severity": self.severity,
            "resource": self.resource,
            "message": self.message,
            "suggestion": self.suggestion,
            "rule_id": self.rule_id,
            "extra": self.extra,
        }


def from_plan_changes(plan_json: dict) -> list[Finding]:
    findings: list[Finding] = []
    for rc in plan_json.get("resource_changes", []):
        actions = rc.get("change", {}).get("actions", [])
        if actions == ["no-op"]:
            continue
        kind = ",".join(actions)
        severity: Severity = "high" if "delete" in actions else "low"
        findings.append(
            Finding(
                type="change",
                severity=severity,
                resource=rc.get("address", "?"),
                message=f"{kind}: {rc.get('type', '?')}",
            )
        )
    return findings


def from_infracost(diff: dict) -> list[Finding]:
    findings: list[Finding] = []
    for project in diff.get("projects", []):
        breakdown = project.get("diff", {})
        for r in breakdown.get("resources", []):
            monthly_diff = r.get("monthlyCost")
            if monthly_diff is None:
                continue
            try:
                cents = round(float(monthly_diff) * 100)
            except (TypeError, ValueError):
                continue
            if cents == 0:
                continue
            sev: Severity = "info"
            if cents >= 50_000:
                sev = "critical"
            elif cents >= 10_000:
                sev = "high"
            elif cents >= 2_000:
                sev = "medium"
            findings.append(
                Finding(
                    type="cost",
                    severity=sev,
                    resource=r.get("name", "?"),
                    message=f"monthly cost delta: ${monthly_diff}",
                    extra={"cents": cents},
                )
            )
    return findings


def from_checkov(results: list[dict]) -> list[Finding]:
    findings: list[Finding] = []
    for r in results:
        failed = r.get("results", {}).get("failed_checks", []) if isinstance(r, dict) else []
        for c in failed:
            sev_map: dict[str, Severity] = {
                "CRITICAL": "critical",
                "HIGH": "high",
                "MEDIUM": "medium",
                "LOW": "low",
                "INFO": "info",
            }
            sev = sev_map.get(str(c.get("severity", "MEDIUM")).upper(), "medium")
            findings.append(
                Finding(
                    type="security",
                    severity=sev,
                    resource=c.get("resource", "?"),
                    message=c.get("check_name", "security finding"),
                    suggestion=c.get("guideline"),
                    rule_id=c.get("check_id"),
                )
            )
    return findings


def aggregate_cost_cents(findings: list[Finding]) -> int:
    return sum(f.extra.get("cents", 0) for f in findings if f.type == "cost")


def risk_score(findings: list[Finding]) -> int:
    weights = {"critical": 25, "high": 10, "medium": 4, "low": 1, "info": 0}
    score = sum(weights[f.severity] for f in findings)
    return min(score, 100)
