from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _uuid() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    github_installation_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(32), default="free")
    # free | premium_active | premium_past_due | premium_canceled | premium_incomplete
    subscription_status: Mapped[str] = mapped_column(String(32), default="free")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(64))
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Repository(Base):
    __tablename__ = "repositories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    github_repo_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    default_branch: Mapped[str] = mapped_column(String(64), default="main")
    enabled: Mapped[bool] = mapped_column(default=True)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PullRequest(Base):
    __tablename__ = "pull_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repositories.id"), index=True)
    github_pr_number: Mapped[int] = mapped_column(Integer)
    head_sha: Mapped[str] = mapped_column(String(40))
    base_sha: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Analysis(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    pr_id: Mapped[str] = mapped_column(ForeignKey("pull_requests.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    plan_storage_key: Mapped[str | None] = mapped_column(String(255))
    cost_delta_cents: Mapped[int | None] = mapped_column(Integer)
    risk_score: Mapped[int | None] = mapped_column(Integer)
    files_scanned: Mapped[int | None] = mapped_column(Integer)
    summary_md: Mapped[str | None] = mapped_column(Text)
    contact_email: Mapped[str | None] = mapped_column(String(255))


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id"), index=True)
    type: Mapped[str] = mapped_column(String(32))
    severity: Mapped[str] = mapped_column(String(16))
    resource_address: Mapped[str] = mapped_column("resource", String(255))
    message: Mapped[str] = mapped_column(Text)
    suggestion: Mapped[str | None] = mapped_column(Text)
    rule_id: Mapped[str | None] = mapped_column(String(64))
    category: Mapped[str | None] = mapped_column(String(64))
    title: Mapped[str | None] = mapped_column(String(512))
    file: Mapped[str | None] = mapped_column(String(512))
    line: Mapped[int | None] = mapped_column(Integer)
    controls: Mapped[list | None] = mapped_column(JSON, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(64))
    target: Mapped[str | None] = mapped_column(String(255))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IncidentEmbedding(Base):
    """Semantic memory row — one per analysis, stores intent text + pgvector embedding."""

    __tablename__ = "incident_embeddings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    repo_full_name: Mapped[str] = mapped_column(String(255))
    pr_number: Mapped[int | None] = mapped_column(Integer)
    intent_text: Mapped[str] = mapped_column(Text)
    severity: Mapped[str | None] = mapped_column(String(32))
    resource: Mapped[str | None] = mapped_column(String(255))
    outcome: Mapped[str | None] = mapped_column(String(32))
    blast_radius: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # embedding_vec is a pgvector column — managed via raw SQL / migration


class AsyncJob(Base):
    """Tracks Celery task lifecycle per analysis."""

    __tablename__ = "async_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    celery_task_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    org_id: Mapped[str | None] = mapped_column(String(36))
    analysis_id: Mapped[str | None] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)


# ── Generic runtime monitoring (Phase 2 domain) ──────────────────────────────


class RuntimeEvent(Base):
    """Any event emitted by an agent or integration (GitHub PR, Terraform plan, etc.)."""

    __tablename__ = "runtime_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    repo_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    analysis_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(
        String(64), index=True
    )  # pr_opened, drift_detected, policy_blocked, cost_alert …
    severity: Mapped[str] = mapped_column(String(16), default="info")  # info | warn | high | critical
    source: Mapped[str] = mapped_column(String(64), default="driftguard")  # github | agent | manual | scheduler
    message: Mapped[str] = mapped_column(Text, default="")
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)


class DriftIncident(Base):
    """Detected operational drift or repeated failure pattern."""

    __tablename__ = "drift_incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    repo_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(16), default="medium")  # low | medium | high | critical
    status: Mapped[str] = mapped_column(String(32), default="open")  # open | investigating | resolved | suppressed
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_fix: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    fingerprint: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # for dedup
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PolicyRule(Base):
    """Runtime guardrail — blocks or warns on matching drift events."""

    __tablename__ = "policy_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rule_type: Mapped[str] = mapped_column(String(64), default="block")  # block | warn | alert
    severity: Mapped[str] = mapped_column(String(16), default="high")
    enabled: Mapped[bool] = mapped_column(default=True)
    conditions: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # {event_type, message_contains, resource_pattern}
    actions: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {notify_email, create_incident, block_merge}
    match_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


# ── API Tokens ─────────────────────────────────────────────────────────────────


class APIToken(Base):
    """
    Hashed API tokens for programmatic access.
    Plaintext is only shown once at creation — never stored.
    """

    __tablename__ = "api_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(128))  # human label
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)  # SHA-256 hex
    role: Mapped[str] = mapped_column(String(32), default="org:member")
    scopes: Mapped[str | None] = mapped_column(String(512))  # csv: "analyses:read,policies:write"
    revoked: Mapped[bool] = mapped_column(default=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(String(64))  # actor who created this


# ── Org membership ─────────────────────────────────────────────────────────────


class OrgMember(Base):
    """
    Maps users (GitHub logins) to organisations with a role.
    Created automatically on first login if the user is the installer.
    """

    __tablename__ = "org_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    github_login: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(32), default="org:member")  # org:owner|admin|member|viewer
    invited_by: Mapped[str | None] = mapped_column(String(64))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ── Terraform resource snapshot ────────────────────────────────────────────────


class TerraformResource(Base):
    """
    Snapshot of a Terraform resource from the last successful plan/state.
    Used for drift baseline comparison and graph analysis.
    """

    __tablename__ = "terraform_resources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), index=True)
    analysis_id: Mapped[str | None] = mapped_column(ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True)

    address: Mapped[str] = mapped_column(String(512), index=True)  # e.g. "module.vpc.aws_subnet.private[0]"
    type: Mapped[str] = mapped_column(String(128), index=True)  # e.g. "aws_subnet"
    name: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(255))
    module: Mapped[str | None] = mapped_column(String(512))
    action: Mapped[str] = mapped_column(String(32))  # ChangeAction
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)  # redacted attribute snapshot
    is_destructive: Mapped[bool] = mapped_column(default=False)
    touches_sensitive: Mapped[bool] = mapped_column(default=False)
    risk_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    snapshotted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


# ── Quota & billing enforcement ───────────────────────────────────────────────


class MonthlyUsage(Base):
    """Per-org monthly PR analysis counter. One row per (org, YYYY-MM)."""

    __tablename__ = "monthly_usage"
    __table_args__ = (UniqueConstraint("org_id", "month", name="uq_monthly_usage_org_month"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    month: Mapped[str] = mapped_column(String(7))  # YYYY-MM UTC
    pr_count: Mapped[int] = mapped_column(Integer, default=0)


class ScanRun(Base):
    """Idempotency log — one row per unique (org, repo, pr_number, head_sha)."""

    __tablename__ = "scan_runs"
    __table_args__ = (UniqueConstraint("org_id", "repo_id", "pr_number", "head_sha", name="uq_scan_run"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    repo_id: Mapped[str] = mapped_column(String(36), index=True)
    pr_number: Mapped[int] = mapped_column(Integer)
    head_sha: Mapped[str] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProcessedStripeEvent(Base):
    """Idempotency guard for Stripe webhook deliveries."""

    __tablename__ = "processed_stripe_events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(64))
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
