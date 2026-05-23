"""
Typed event schemas — Pydantic v2 discriminated unions.
Every significant action in DriftGuard emits one of these.

Events are:
  1. Published to Redis Streams (real-time delivery, WebSocket fan-out)
  2. Persisted to audit_log (compliance, immutable)
  3. Optionally forwarded to external webhooks

Design constraints:
  - All events carry org_id for multi-tenant routing
  - All events carry correlation_id for distributed tracing
  - Schemas are versioned (schema_version field)
  - No mutable fields — events are append-only facts
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(UTC)


def _uid() -> str:
    return str(uuid4())


# ── Severity + Status enums ───────────────────────────────────────────────────


class Severity(StrEnum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChangeAction(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    REPLACE = "replace"  # destroy+create
    NO_OP = "no-op"
    READ = "read"


# ── Base event ────────────────────────────────────────────────────────────────


class BaseEvent(BaseModel):
    """All DriftGuard events share this envelope."""

    model_config = {"frozen": True}

    event_id: str = Field(default_factory=_uid)
    occurred_at: datetime = Field(default_factory=_now)
    schema_version: str = "1"

    # Routing
    org_id: str
    repo_id: str | None = None

    # Tracing
    correlation_id: str = Field(default_factory=_uid)
    actor: str | None = None  # github_login or "system"


# ── Phase 2: Terraform / PR events ───────────────────────────────────────────


class ResourceChange(BaseModel):
    """One resource change from a Terraform plan."""

    model_config = {"frozen": True}

    address: str  # e.g. "aws_s3_bucket.uploads"
    type: str  # e.g. "aws_s3_bucket"
    name: str  # e.g. "uploads"
    module: str | None  # e.g. "module.storage"
    action: ChangeAction
    provider: str  # e.g. "registry.terraform.io/hashicorp/aws"
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    after_unknown: dict[str, Any] = Field(default_factory=dict)
    replace_paths: list[str] = Field(default_factory=list)
    # derived
    is_destructive: bool = False
    touches_sensitive: bool = False
    sensitive_paths: list[str] = Field(default_factory=list)


class PROpenedEvent(BaseEvent):
    event_type: Literal["pr.opened"] = "pr.opened"
    pr_id: str
    pr_number: int
    head_sha: str
    base_sha: str
    title: str
    author: str
    repo_name: str
    base_branch: str
    draft: bool = False


class AnalysisStartedEvent(BaseEvent):
    event_type: Literal["analysis.started"] = "analysis.started"
    analysis_id: str
    pr_id: str
    pr_number: int
    repo_name: str


class PlanParsedEvent(BaseEvent):
    """Emitted after terraform plan JSON is parsed — before scoring."""

    event_type: Literal["plan.parsed"] = "plan.parsed"
    analysis_id: str
    resource_changes: list[ResourceChange]
    total_changes: int
    creates: int
    updates: int
    deletes: int
    replaces: int
    has_destructive: bool
    tf_version: str | None = None


class RiskScoredEvent(BaseEvent):
    """Emitted after deterministic risk scoring — before AI review."""

    event_type: Literal["risk.scored"] = "risk.scored"
    analysis_id: str
    risk_score: int  # 0-100
    risk_level: Severity
    cost_delta_usd: float | None  # monthly delta
    blocked: bool
    block_reasons: list[str] = Field(default_factory=list)
    score_factors: dict[str, int] = Field(default_factory=dict)


class FindingRaisedEvent(BaseEvent):
    event_type: Literal["finding.raised"] = "finding.raised"
    analysis_id: str
    finding_id: str
    severity: Severity
    rule_id: str
    title: str
    resource: str
    source: str  # "checkov" | "custom_policy" | "cost" | "drift" | "ai"


class AnalysisCompletedEvent(BaseEvent):
    event_type: Literal["analysis.completed"] = "analysis.completed"
    analysis_id: str
    pr_id: str
    pr_number: int
    repo_name: str
    risk_score: int
    risk_level: Severity
    blocked: bool
    finding_count: int
    cost_delta_usd: float | None
    duration_ms: int
    comment_posted: bool = False


class PolicyBlockedEvent(BaseEvent):
    event_type: Literal["policy.blocked"] = "policy.blocked"
    analysis_id: str
    policy_id: str
    policy_name: str
    resource: str
    reason: str


# ── Phase 3: Drift events ─────────────────────────────────────────────────────


class DriftDetectedEvent(BaseEvent):
    event_type: Literal["drift.detected"] = "drift.detected"
    resource_address: str
    resource_type: str
    drift_type: str  # "state_mismatch" | "manual_change" | "orphan"
    expected: dict[str, Any]
    actual: dict[str, Any]
    diff_paths: list[str]
    severity: Severity


class IncidentOpenedEvent(BaseEvent):
    event_type: Literal["incident.opened"] = "incident.opened"
    incident_id: str
    title: str
    severity: Severity
    fingerprint: str


class IncidentResolvedEvent(BaseEvent):
    event_type: Literal["incident.resolved"] = "incident.resolved"
    incident_id: str
    resolved_by: str | None
    duration_seconds: int


# ── Phase 5: Platform events ──────────────────────────────────────────────────


class NotificationSentEvent(BaseEvent):
    event_type: Literal["notification.sent"] = "notification.sent"
    channel: str  # "slack" | "email" | "pagerduty" | "webhook"
    target: str
    success: bool
    analysis_id: str | None = None
    incident_id: str | None = None


# ── Discriminated union of all events ─────────────────────────────────────────

DriftGuardEvent = Annotated[
    PROpenedEvent
    | AnalysisStartedEvent
    | PlanParsedEvent
    | RiskScoredEvent
    | FindingRaisedEvent
    | AnalysisCompletedEvent
    | PolicyBlockedEvent
    | DriftDetectedEvent
    | IncidentOpenedEvent
    | IncidentResolvedEvent
    | NotificationSentEvent,
    Field(discriminator="event_type"),
]
