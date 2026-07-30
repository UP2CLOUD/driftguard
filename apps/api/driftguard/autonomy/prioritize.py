"""Pure prioritization: sort and cap findings. No I/O, no LLM calls."""

from __future__ import annotations

from driftguard.autonomy.schemas import AgentFinding, AutonomyConfig, severity_rank


def prioritize(findings: list[AgentFinding], config: AutonomyConfig) -> list[AgentFinding]:
    """Cap per-role, then sort by severity desc, then cap overall.

    Per-role cap runs first so one noisy role can't crowd out the others
    before the overall cap is applied.
    """
    per_role: dict[str, list[AgentFinding]] = {}
    for f in findings:
        per_role.setdefault(f.role, []).append(f)

    capped: list[AgentFinding] = []
    for role_findings in per_role.values():
        ranked = sorted(role_findings, key=lambda f: severity_rank(f.severity), reverse=True)
        capped.extend(ranked[: config.max_findings_per_role])

    capped.sort(key=lambda f: severity_rank(f.severity), reverse=True)
    return capped[: config.max_findings_per_run]
