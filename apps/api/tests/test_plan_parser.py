"""Tests for Terraform plan parser + risk scorer."""

from __future__ import annotations

import pytest

from driftguard.events.schemas import ChangeAction, Severity
from driftguard.services.terraform.plan_parser import TerraformPlan, parse_plan
from driftguard.services.terraform.risk_scorer import score

# ── Fixtures ──────────────────────────────────────────────────────────────────


def _plan(**overrides) -> dict:
    """Minimal valid plan JSON with one resource change."""
    defaults = {
        "format_version": "1.2",
        "terraform_version": "1.7.0",
        "resource_changes": [
            {
                "address": "aws_s3_bucket.uploads",
                "type": "aws_s3_bucket",
                "name": "uploads",
                "provider_config_key": "registry.terraform.io/hashicorp/aws",
                "change": {
                    "actions": ["create"],
                    "before": None,
                    "after": {"bucket": "my-uploads", "region": "eu-west-1"},
                    "after_unknown": {},
                },
            }
        ],
    }
    defaults.update(overrides)
    return defaults


# ── parse_plan ─────────────────────────────────────────────────────────────────


class TestParsePlan:
    def test_empty_plan_returns_no_changes(self):
        plan = parse_plan({"format_version": "1.2", "resource_changes": []})
        assert isinstance(plan, TerraformPlan)
        assert plan.changes == []
        assert plan.has_destructive is False

    def test_create_action(self):
        plan = parse_plan(_plan())
        assert len(plan.changes) == 1
        c = plan.changes[0]
        assert c.action == ChangeAction.CREATE
        assert c.address == "aws_s3_bucket.uploads"
        assert c.type == "aws_s3_bucket"

    def test_delete_action(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["delete"]
        raw["resource_changes"][0]["change"]["before"] = {"bucket": "old"}
        raw["resource_changes"][0]["change"]["after"] = None
        plan = parse_plan(raw)
        assert plan.changes[0].action == ChangeAction.DELETE
        assert plan.changes[0].is_destructive is True

    def test_replace_action(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["delete", "create"]
        plan = parse_plan(raw)
        assert plan.changes[0].action == ChangeAction.REPLACE
        assert plan.changes[0].is_destructive is True

    def test_noop_excluded(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["no-op"]
        plan = parse_plan(raw)
        assert plan.changes == []  # no-ops filtered out

    def test_update_action(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["update"]
        raw["resource_changes"][0]["change"]["before"] = {"bucket": "old", "region": "us-east-1"}
        raw["resource_changes"][0]["change"]["after"] = {"bucket": "old", "region": "eu-west-1"}
        plan = parse_plan(raw)
        assert plan.changes[0].action == ChangeAction.UPDATE

    def test_sensitive_detection_from_map(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["update"]
        raw["resource_resources"][0]["change"] if False else None
        raw["resource_changes"][0]["change"]["before"] = {"password": "old"}
        raw["resource_changes"][0]["change"]["after"] = {"password": "new"}
        raw["resource_changes"][0]["change"]["after_sensitive"] = {"password": True}
        plan = parse_plan(raw)
        assert plan.changes[0].touches_sensitive is True
        assert "password" in plan.changes[0].sensitive_paths

    def test_sensitive_redacted_from_output(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["after_sensitive"] = {"bucket": True}
        raw["resource_changes"][0]["change"]["after"] = {"bucket": "secret-bucket"}
        plan = parse_plan(raw)
        # Sensitive attributes should be redacted in the parsed output
        assert plan.changes[0].after.get("bucket") == "[REDACTED]"

    def test_tf_version_captured(self):
        plan = parse_plan(_plan())
        assert plan.tf_version == "1.7.0"

    def test_counters(self):
        raw = {
            "format_version": "1.2",
            "terraform_version": "1.7.0",
            "resource_changes": [
                {
                    "address": f"aws_instance.web{i}",
                    "type": "aws_instance",
                    "name": f"web{i}",
                    "provider_config_key": "aws",
                    "change": {"actions": ["create"], "before": None, "after": {}, "after_unknown": {}},
                }
                for i in range(3)
            ]
            + [
                {
                    "address": "aws_rds_cluster.prod",
                    "type": "aws_rds_cluster",
                    "name": "prod",
                    "provider_config_key": "aws",
                    "change": {"actions": ["delete"], "before": {"id": "prod"}, "after": None, "after_unknown": {}},
                }
            ],
        }
        plan = parse_plan(raw)
        assert plan.creates == 3
        assert plan.deletes == 1
        assert plan.has_destructive is True

    def test_module_address_preserved(self):
        raw = _plan()
        raw["resource_changes"][0]["address"] = "module.storage.aws_s3_bucket.uploads"
        raw["resource_changes"][0]["module_address"] = "module.storage"
        plan = parse_plan(raw)
        assert plan.changes[0].module == "module.storage"

    def test_invalid_input_raises(self):
        with pytest.raises((ValueError, AttributeError)):
            parse_plan("not a dict")  # type: ignore


# ── risk_scorer ────────────────────────────────────────────────────────────────


class TestRiskScorer:
    def _changes_from(self, plan_json: dict):
        return parse_plan(plan_json).changes

    def test_empty_returns_zero(self):
        result = score([])
        assert result.score == 0
        assert result.level == Severity.INFO
        assert result.blocked is False

    def test_create_s3_low_risk(self):
        plan = parse_plan(_plan())
        result = score(plan.changes)
        assert result.score < 40
        assert result.blocked is False

    def test_delete_rds_critical(self):
        raw = _plan()
        raw["resource_changes"][0] = {
            "address": "aws_rds_cluster.prod",
            "type": "aws_rds_cluster",
            "name": "prod",
            "provider_config_key": "registry.terraform.io/hashicorp/aws",
            "change": {
                "actions": ["delete"],
                "before": {"cluster_identifier": "prod", "deletion_protection": True},
                "after": None,
                "after_unknown": {},
            },
        }
        result = score(parse_plan(raw).changes)
        assert result.score >= 70
        assert result.blocked is True
        assert result.level in (Severity.HIGH, Severity.CRITICAL)

    def test_prod_env_multiplier_increases_score(self):
        plan = parse_plan(_plan())
        result_dev = score(plan.changes, env_label="dev")
        result_prod = score(plan.changes, env_label="prod")
        assert result_prod.score > result_dev.score

    def test_s3_public_access_removal_high_score(self):
        raw = _plan()
        raw["resource_changes"][0] = {
            "address": "aws_s3_bucket_public_access_block.main",
            "type": "aws_s3_bucket_public_access_block",
            "name": "main",
            "provider_config_key": "registry.terraform.io/hashicorp/aws",
            "change": {
                "actions": ["update"],
                "before": {"block_public_acls": True, "block_public_policy": True},
                "after": {"block_public_acls": False, "block_public_policy": False},
                "after_unknown": {},
            },
        }
        result = score(parse_plan(raw).changes)
        assert result.score >= 50  # S3 public access removal is high-risk

    def test_score_bounded_0_to_100(self):
        """Even pathological plans should not exceed 100."""
        raw = {
            "format_version": "1.2",
            "terraform_version": "1.7.0",
            "resource_changes": [
                {
                    "address": f"aws_rds_cluster.db{i}",
                    "type": "aws_rds_cluster",
                    "name": f"db{i}",
                    "provider_config_key": "registry.terraform.io/hashicorp/aws",
                    "change": {"actions": ["delete"], "before": {"id": f"db{i}"}, "after": None, "after_unknown": {}},
                }
                for i in range(20)
            ],
        }
        result = score(parse_plan(raw).changes)
        assert 0 <= result.score <= 100

    def test_block_reasons_non_empty_when_blocked(self):
        raw = _plan()
        raw["resource_changes"][0]["change"]["actions"] = ["delete"]
        raw["resource_changes"][0]["change"]["before"] = {"id": "x"}
        raw["resource_changes"][0]["change"]["after"] = None
        result = score(parse_plan(raw).changes, block_threshold=30)
        assert result.blocked is True
        assert len(result.block_reasons) > 0

    def test_score_factors_populated(self):
        plan = parse_plan(_plan())
        result = score(plan.changes)
        assert isinstance(result.score_factors, dict)

    def test_replace_higher_than_update(self):
        def _make(actions: list[str]) -> int:
            raw = _plan()
            raw["resource_changes"][0]["change"]["actions"] = actions
            raw["resource_changes"][0]["change"]["before"] = {"id": "x"}
            raw["resource_changes"][0]["change"]["after"] = {"id": "y"}
            return score(parse_plan(raw).changes).score

        assert _make(["delete", "create"]) > _make(["update"])

    def test_severity_levels_ordered(self):
        _ORDER = [Severity.INFO, Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]
        assert _ORDER == sorted(_ORDER, key=lambda s: [Severity.INFO, Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL].index(s))
        assert Severity.CRITICAL == "critical"
        assert Severity.HIGH == "high"
