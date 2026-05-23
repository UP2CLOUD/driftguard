"""Tests for event schemas + publisher."""

from __future__ import annotations

import json

import pytest
from pydantic import TypeAdapter

from driftguard.events.schemas import (
    AnalysisCompletedEvent,
    ChangeAction,
    DriftGuardEvent,
    PlanParsedEvent,
    ResourceChange,
    Severity,
)


class TestEventSchemas:
    def test_analysis_completed_roundtrip(self):
        ev = AnalysisCompletedEvent(
            org_id="org-1",
            repo_id="repo-1",
            analysis_id="an-1",
            pr_id="pr-1",
            pr_number=42,
            repo_name="acme/infra",
            risk_score=75,
            risk_level=Severity.HIGH,
            blocked=True,
            finding_count=3,
            cost_delta_usd=480.0,
            duration_ms=1200,
        )
        data = json.loads(ev.model_dump_json())
        assert data["event_type"] == "analysis.completed"
        assert data["risk_score"] == 75
        assert data["blocked"] is True

    def test_resource_change_frozen(self):
        rc = ResourceChange(
            address="aws_s3_bucket.test",
            type="aws_s3_bucket",
            name="test",
            module=None,
            action=ChangeAction.CREATE,
            provider="registry.terraform.io/hashicorp/aws",
            before=None,
            after={"bucket": "test"},
        )
        with pytest.raises((TypeError, ValueError)):
            rc.address = "changed"  # frozen model

    def test_discriminated_union_parse(self):
        ta = TypeAdapter(DriftGuardEvent)
        raw = {
            "event_type": "analysis.completed",
            "org_id": "org-1",
            "analysis_id": "an-1",
            "pr_id": "pr-1",
            "pr_number": 1,
            "repo_name": "x/y",
            "risk_score": 50,
            "risk_level": "medium",
            "blocked": False,
            "finding_count": 0,
            "cost_delta_usd": None,
            "duration_ms": 500,
        }
        ev = ta.validate_python(raw)
        assert isinstance(ev, AnalysisCompletedEvent)

    def test_event_id_unique(self):
        ev1 = AnalysisCompletedEvent(
            org_id="org-1",
            analysis_id="an-1",
            pr_id="pr-1",
            pr_number=1,
            repo_name="x/y",
            risk_score=0,
            risk_level=Severity.INFO,
            blocked=False,
            finding_count=0,
            cost_delta_usd=None,
            duration_ms=0,
        )
        ev2 = AnalysisCompletedEvent(
            org_id="org-1",
            analysis_id="an-1",
            pr_id="pr-1",
            pr_number=1,
            repo_name="x/y",
            risk_score=0,
            risk_level=Severity.INFO,
            blocked=False,
            finding_count=0,
            cost_delta_usd=None,
            duration_ms=0,
        )
        assert ev1.event_id != ev2.event_id

    def test_plan_parsed_event(self):
        rc = ResourceChange(
            address="aws_rds_cluster.prod",
            type="aws_rds_cluster",
            name="prod",
            module=None,
            action=ChangeAction.DELETE,
            provider="registry.terraform.io/hashicorp/aws",
            before={"id": "prod"},
            after=None,
            is_destructive=True,
        )
        ev = PlanParsedEvent(
            org_id="org-1",
            analysis_id="an-1",
            resource_changes=[rc],
            total_changes=1,
            creates=0,
            updates=0,
            deletes=1,
            replaces=0,
            has_destructive=True,
            tf_version="1.7.0",
        )
        assert ev.has_destructive is True
        assert ev.event_type == "plan.parsed"
