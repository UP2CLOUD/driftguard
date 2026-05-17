from collections import Counter

from driftguard.compliance.controls import CATALOG, Control, ControlRef
from driftguard.compliance.mappings import controls_for_rule


def enrich_finding_with_controls(rule_id: str | None) -> list[Control]:
    return [CATALOG[c] for c in controls_for_rule(rule_id) if c in CATALOG]


def summarize_frameworks(findings_rule_ids: list[str | None]) -> dict[str, int]:
    framework_counter: Counter[str] = Counter()
    for rid in findings_rule_ids:
        for c in enrich_finding_with_controls(rid):
            for ref in c.refs:
                framework_counter[ref.framework] += 1
    return dict(framework_counter)


def control_summary(findings_rule_ids: list[str | None]) -> dict[str, list[ControlRef]]:
    hit: dict[str, list[ControlRef]] = {}
    for rid in findings_rule_ids:
        for c in enrich_finding_with_controls(rid):
            hit.setdefault(c.id, list(c.refs))
    return hit


__all__ = [
    "Control",
    "ControlRef",
    "control_summary",
    "enrich_finding_with_controls",
    "summarize_frameworks",
]
