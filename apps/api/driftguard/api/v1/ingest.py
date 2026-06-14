"""POST /api/v1/ingest/event — generic agent event ingestion with drift detection."""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.core.rate_limit import rate_limit
from driftguard.db.models import (
    DriftIncident,
    Organization,
    Repository,
    RuntimeEvent,
)

router = APIRouter(prefix="/ingest", tags=["ingest"])

SEVERITY_WEIGHTS = {"critical": 4, "high": 3, "warn": 2, "info": 1}
INCIDENT_THRESHOLD = {"critical", "high"}
RECURRENCE_WINDOW_HOURS = 72


class IngestEventRequest(BaseModel):
    # Identity
    installation_id: int = Field(..., description="GitHub App installation ID")
    repo_full_name: str | None = Field(None, description="e.g. acme/infra")
    # Event
    event_type: str = Field(..., description="pr_opened|drift_detected|policy_blocked|cost_alert|security_finding")
    severity: str = Field("info", description="info|warn|high|critical")
    source: str = Field("driftguard", description="github|agent|manual|scheduler")
    message: str = Field(..., min_length=1, max_length=2048)
    metadata: dict | None = None


class IngestEventResponse(BaseModel):
    accepted: bool
    event_id: str
    incident_created: bool
    incident_id: str | None
    incident_recurrence: int
    matched_existing: bool
    risk_score: float
    recommended_action: str


def _fingerprint(event_type: str, message: str, repo: str | None) -> str:
    """Deterministic dedup key — event type + normalised message."""
    normalised = " ".join(message.lower().split())[:200]
    raw = f"{event_type}:{repo or ''}:{normalised}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _risk_score(severity: str, recurrence: int) -> float:
    weight = SEVERITY_WEIGHTS.get(severity, 1)
    base = min(1.0, weight / 4)
    recurrence_boost = min(0.2, recurrence * 0.04)
    return round(min(1.0, base + recurrence_boost), 2)


def _recommended_action(severity: str, incident_created: bool, recurrence: int) -> str:
    if severity == "critical":
        return "block_and_review"
    if severity == "high" and recurrence > 2:
        return "escalate_policy"
    if severity == "high":
        return "review_immediately"
    if incident_created:
        return "review_policy"
    return "monitor"


async def _evaluate_policies(db: AsyncSession, org_id: str, event_type: str, severity: str, message: str) -> None:
    """Check event against enabled policy rules; increment match_count on hits."""

    from driftguard.db.models import PolicyRule

    rules = (
        (
            await db.execute(
                select(PolicyRule).where(
                    PolicyRule.org_id == org_id,
                    PolicyRule.enabled.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )

    for rule in rules:
        cond = rule.conditions or {}
        # Match on event_type
        if "event_type" in cond and cond["event_type"] != event_type:
            continue
        # Match on severity
        if "severity" in cond and cond["severity"] != severity:
            continue
        # Match on message substring
        if "message_contains" in cond:
            if cond["message_contains"].lower() not in message.lower():
                continue
        # Rule matched
        rule.match_count = (rule.match_count or 0) + 1


@router.post("/event", response_model=IngestEventResponse)
async def ingest_event(
    body: IngestEventRequest,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(rate_limit(per_minute=30, per_hour=500)),
) -> IngestEventResponse:
    # 1. Resolve org — reject unknown installations to prevent data injection
    org = (
        (
            await db.execute(
                select(Organization)
                .where(Organization.github_installation_id == body.installation_id)
                .order_by(Organization.created_at.desc())
            )
        )
        .scalars()
        .first()
    )
    if not org:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail=f"Installation {body.installation_id} not registered")

    # 2. Resolve optional repo
    repo_id: str | None = None
    if body.repo_full_name:
        repo_result = await db.execute(
            select(Repository).where(
                Repository.full_name == body.repo_full_name,
                Repository.org_id == org.id,
            )
        )
        repo = repo_result.scalar_one_or_none()
        if repo:
            repo_id = repo.id

    # 3. Persist RuntimeEvent
    event = RuntimeEvent(
        id=str(uuid.uuid4()),
        org_id=org.id,
        repo_id=repo_id,
        event_type=body.event_type,
        severity=body.severity,
        source=body.source,
        message=body.message,
        metadata_=body.metadata,
    )
    db.add(event)

    # 4. Drift detection — only for high/critical
    incident_created = False
    incident_id: str | None = None
    recurrence = 1

    if body.severity in INCIDENT_THRESHOLD:
        fp = _fingerprint(body.event_type, body.message, body.repo_full_name)
        window_start = datetime.now(UTC) - timedelta(hours=RECURRENCE_WINDOW_HOURS)

        existing = (
            (
                await db.execute(
                    select(DriftIncident)
                    .where(
                        and_(
                            DriftIncident.org_id == org.id,
                            DriftIncident.fingerprint == fp,
                            DriftIncident.status != "resolved",
                            DriftIncident.last_seen_at >= window_start,
                        )
                    )
                    .order_by(DriftIncident.last_seen_at.desc())
                )
            )
            .scalars()
            .first()
        )

        if existing:
            # Update recurrence
            existing.recurrence_count += 1
            existing.last_seen_at = datetime.now(UTC)
            if body.severity == "critical" and not existing.suggested_fix:
                existing.suggested_fix = _auto_fix_hint(body.event_type, body.message)
            recurrence = existing.recurrence_count
            incident_id = existing.id
        else:
            # Create new incident
            incident = DriftIncident(
                id=str(uuid.uuid4()),
                org_id=org.id,
                repo_id=repo_id,
                title=_title_from(body.event_type, body.message),
                description=body.message,
                severity=body.severity,
                status="open",
                root_cause=_root_cause_hint(body.event_type),
                suggested_fix=_auto_fix_hint(body.event_type, body.message),
                fingerprint=fp,
                first_seen_at=datetime.now(UTC),
                last_seen_at=datetime.now(UTC),
            )
            db.add(incident)
            await db.flush()
            incident_id = incident.id
            incident_created = True

    # 5. Fire Slack notification for new critical/high incidents
    if incident_created and body.severity in {"critical", "high"}:
        try:
            import asyncio

            from driftguard.services.slack import notify_incident

            asyncio.create_task(
                notify_incident(
                    title=_title_from(body.event_type, body.message),
                    severity=body.severity,
                    repo=body.repo_full_name or "unknown",
                    risk_score=int(_risk_score(body.severity, recurrence) * 100),
                )
            )
        except Exception:  # noqa: S110
            pass  # Slack is non-blocking — never fail the ingest

    # 6. Evaluate active policy rules
    await _evaluate_policies(db, org.id, body.event_type, body.severity, body.message)

    await db.commit()

    return IngestEventResponse(
        accepted=True,
        event_id=event.id,
        incident_created=incident_created,
        incident_id=incident_id,
        incident_recurrence=recurrence,
        matched_existing=not incident_created and incident_id is not None,
        risk_score=_risk_score(body.severity, recurrence),
        recommended_action=_recommended_action(body.severity, incident_created, recurrence),
    )


# ── Heuristic helpers ─────────────────────────────────────────────────────────


def _title_from(event_type: str, message: str) -> str:
    prefix = {
        "policy_blocked": "Policy blocked",
        "drift_detected": "Drift detected",
        "security_finding": "Security finding",
        "cost_alert": "Cost alert",
        "pr_opened": "Risky PR",
    }.get(event_type, event_type.replace("_", " ").title())
    return f"{prefix}: {message[:80]}"


def _root_cause_hint(event_type: str) -> str:
    return {
        "policy_blocked": "A resource change violated a declared policy rule.",
        "drift_detected": "Live cloud state diverged from the Terraform plan.",
        "security_finding": "A misconfiguration or insecure default was detected.",
        "cost_alert": "A resource change would exceed the configured cost threshold.",
        "pr_opened": "An AI agent opened a PR with high-risk changes.",
    }.get(event_type, "Automated detection flagged this event.")


def _auto_fix_hint(event_type: str, message: str) -> str | None:
    msg = message.lower()
    if "public" in msg and "s3" in msg:
        return "Enable S3 Block Public Access: aws_s3_bucket_public_access_block { block_public_acls = true }"
    if "wildcard" in msg or 'resources = "*"' in msg:
        return "Restrict IAM policy resources to specific ARNs instead of wildcard."
    if "delete" in msg and "rds" in msg:
        return "Add lifecycle { prevent_destroy = true } to protect production databases."
    if "0.0.0.0" in msg or "ingress" in msg:
        return "Restrict security group ingress to known CIDR ranges."
    return None
