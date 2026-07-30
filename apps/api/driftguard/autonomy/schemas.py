"""Typed contracts for the autonomy fleet.

Phase 1 scope: agents read the repo and propose findings. Nothing here
writes code or opens PRs — see .driftguard/autonomy/README.md for the
phase boundary.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

AgentRole = Literal[
    "product",
    "uiux",
    "qa",
    "performance",
    "reliability",
    "security",
    "codehealth",
    "seo",
    "analytics",
]

ALL_ROLES: tuple[AgentRole, ...] = (
    "product",
    "uiux",
    "qa",
    "performance",
    "reliability",
    "security",
    "codehealth",
    "seo",
    "analytics",
)

Severity = Literal["info", "low", "medium", "high", "critical"]

_SEVERITY_RANK: dict[Severity, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}


@dataclass
class AgentFinding:
    """One observation from one agent role about the repo."""

    role: AgentRole
    severity: Severity
    area: str  # e.g. "apps/web/app/(marketing)", "apps/api/driftguard/services"
    title: str
    description: str
    suggestion: str | None = None

    def dedup_key(self) -> str:
        """Stable key for memory comparison — same role+area+title is the same finding."""
        return f"{self.role}:{self.area}:{self.title}".strip().lower()

    def to_dict(self) -> dict:
        return {
            "role": self.role,
            "severity": self.severity,
            "area": self.area,
            "title": self.title,
            "description": self.description,
            "suggestion": self.suggestion,
        }

    @staticmethod
    def from_dict(d: dict) -> AgentFinding:
        return AgentFinding(
            role=d["role"],
            severity=d["severity"],
            area=d["area"],
            title=d["title"],
            description=d["description"],
            suggestion=d.get("suggestion"),
        )


@dataclass
class AutonomyConfig:
    """Loaded from .driftguard/autonomy/config.json."""

    enabled_roles: tuple[AgentRole, ...] = ALL_ROLES
    protected_paths: tuple[str, ...] = (
        "apps/api/driftguard/db/migrations",
        "apps/api/driftguard/core/config.py",
        ".github/workflows",
        "infra",
    )
    max_findings_per_role: int = 5
    max_findings_per_run: int = 20
    oscillation_window_runs: int = 3  # a dedup_key rejected this many runs in a row is suppressed

    @staticmethod
    def from_dict(d: dict) -> AutonomyConfig:
        return AutonomyConfig(
            enabled_roles=tuple(d.get("enabled_roles", ALL_ROLES)),
            protected_paths=tuple(d.get("protected_paths", AutonomyConfig.protected_paths)),
            max_findings_per_role=d.get("max_findings_per_role", 5),
            max_findings_per_run=d.get("max_findings_per_run", 20),
            oscillation_window_runs=d.get("oscillation_window_runs", 3),
        )


@dataclass
class RunResult:
    """Output of one orchestrator run — persisted to runs/<date>.json."""

    findings: list[AgentFinding] = field(default_factory=list)
    suppressed_dedup_keys: list[str] = field(default_factory=list)
    roles_run: list[AgentRole] = field(default_factory=list)
    roles_skipped: list[AgentRole] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "findings": [f.to_dict() for f in self.findings],
            "suppressed_dedup_keys": self.suppressed_dedup_keys,
            "roles_run": self.roles_run,
            "roles_skipped": self.roles_skipped,
        }


def severity_rank(sev: Severity) -> int:
    return _SEVERITY_RANK[sev]
