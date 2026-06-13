"""Unit tests for driftguard.services.terraform.risk_scorer — deterministic scoring."""

from __future__ import annotations

from driftguard.events.schemas import ChangeAction, ResourceChange, Severity
from driftguard.services.terraform.risk_scorer import (
    _env_multiplier,
    _severity_from_score,
    score,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _change(
    resource_type: str = "aws_s3_bucket",
    action: ChangeAction = ChangeAction.UPDATE,
    address: str | None = None,
    provider: str = "registry.terraform.io/hashicorp/aws",
    before: dict | None = None,
    after: dict | None = None,
    is_destructive: bool = False,
    touches_sensitive: bool = False,
    sensitive_paths: list[str] | None = None,
) -> ResourceChange:
    return ResourceChange(
        address=address or f"{resource_type}.test",
        type=resource_type,
        name="test",
        module=None,
        action=action,
        provider=provider,
        before=before,
        after=after,
        is_destructive=is_destructive,
        touches_sensitive=touches_sensitive,
        sensitive_paths=sensitive_paths or [],
    )


# ── Empty input ────────────────────────────────────────────────────────────────


class TestScoreEmptyInput:
    def test_empty_changes_returns_zero(self):
        result = score([])
        assert result.score == 0
        assert result.level == Severity.INFO
        assert not result.blocked
        assert result.block_reasons == []
        assert result.scored_changes == []
        assert result.score_factors == {}

    def test_empty_total_changes_is_zero(self):
        result = score([])
        assert result.total_changes == 0


# ── Severity levels ────────────────────────────────────────────────────────────


class TestSeverityFromScore:
    def test_critical_at_80(self):
        assert _severity_from_score(80) == Severity.CRITICAL

    def test_critical_at_100(self):
        assert _severity_from_score(100) == Severity.CRITICAL

    def test_high_at_60(self):
        assert _severity_from_score(60) == Severity.HIGH

    def test_high_at_79(self):
        assert _severity_from_score(79) == Severity.HIGH

    def test_medium_at_30(self):
        assert _severity_from_score(30) == Severity.MEDIUM

    def test_medium_at_59(self):
        assert _severity_from_score(59) == Severity.MEDIUM

    def test_low_at_10(self):
        assert _severity_from_score(10) == Severity.LOW

    def test_low_at_29(self):
        assert _severity_from_score(29) == Severity.LOW

    def test_info_at_0(self):
        assert _severity_from_score(0) == Severity.INFO

    def test_info_at_9(self):
        assert _severity_from_score(9) == Severity.INFO


# ── Environment multiplier ────────────────────────────────────────────────────


class TestEnvMultiplier:
    def test_prod_is_1_4(self):
        assert _env_multiplier("prod") == 1.4

    def test_production_is_1_4(self):
        assert _env_multiplier("production") == 1.4

    def test_staging_is_1_1(self):
        assert _env_multiplier("staging") == 1.1

    def test_dev_is_0_8(self):
        assert _env_multiplier("dev") == 0.8

    def test_test_is_0_7(self):
        assert _env_multiplier("test") == 0.7

    def test_unknown_defaults_to_1_0(self):
        assert _env_multiplier("unknown") == 1.0

    def test_case_insensitive(self):
        assert _env_multiplier("PROD") == 1.4
        assert _env_multiplier("Staging") == 1.1


# ── Basic action scoring ───────────────────────────────────────────────────────


class TestActionScoring:
    def test_delete_scores_higher_than_create(self):
        create = score([_change(action=ChangeAction.CREATE)])
        delete = score([_change(action=ChangeAction.DELETE, is_destructive=True)])
        assert delete.score > create.score

    def test_delete_scores_higher_than_update(self):
        update = score([_change(action=ChangeAction.UPDATE)])
        delete = score([_change(action=ChangeAction.DELETE, is_destructive=True)])
        assert delete.score > update.score

    def test_replace_scores_higher_than_delete(self):
        delete = score([_change(action=ChangeAction.DELETE, is_destructive=True)])
        replace = score([_change(action=ChangeAction.REPLACE, is_destructive=True)])
        assert replace.score >= delete.score

    def test_noop_scores_zero(self):
        result = score([_change(action=ChangeAction.NO_OP)])
        assert result.score == 0

    def test_read_scores_zero(self):
        result = score([_change(action=ChangeAction.READ)])
        assert result.score == 0

    def test_update_produces_nonzero_score(self):
        result = score([_change(action=ChangeAction.UPDATE)])
        assert result.score > 0


# ── Resource type weights ─────────────────────────────────────────────────────


class TestResourceWeights:
    def test_rds_delete_higher_than_s3_delete(self):
        rds = score([_change("aws_rds_instance", ChangeAction.DELETE, is_destructive=True)])
        s3 = score([_change("aws_s3_bucket", ChangeAction.DELETE, is_destructive=True)])
        assert rds.score >= s3.score

    def test_unknown_resource_uses_default_weight(self):
        result = score([_change("custom_resource_xyz", ChangeAction.DELETE)])
        assert result.score > 0

    def test_security_group_update_has_meaningful_score(self):
        result = score([_change("aws_security_group", ChangeAction.UPDATE)])
        assert result.score >= 10


# ── Blocking ──────────────────────────────────────────────────────────────────


class TestBlocking:
    def test_high_risk_delete_is_blocked_at_default_threshold(self):
        result = score(
            [_change("aws_rds_cluster", ChangeAction.DELETE, is_destructive=True)],
            block_threshold=70,
        )
        assert result.blocked

    def test_low_risk_change_is_not_blocked(self):
        result = score(
            [_change("aws_instance", ChangeAction.CREATE)],
            block_threshold=70,
        )
        assert not result.blocked

    def test_block_threshold_respected(self):
        result = score(
            [_change("aws_s3_bucket", ChangeAction.UPDATE)],
            block_threshold=5,  # very low threshold
        )
        assert result.blocked

    def test_block_reasons_populated_when_blocked(self):
        result = score(
            [_change("aws_rds_cluster", ChangeAction.DELETE, is_destructive=True)],
        )
        if result.blocked:
            assert len(result.block_reasons) > 0


# ── Environment label ─────────────────────────────────────────────────────────


class TestEnvLabel:
    def test_prod_multiplier_raises_score(self):
        dev = score([_change(action=ChangeAction.DELETE, is_destructive=True)], env_label="dev")
        prod = score([_change(action=ChangeAction.DELETE, is_destructive=True)], env_label="prod")
        assert prod.score > dev.score

    def test_prod_destructive_has_floor_65(self):
        result = score(
            [_change("aws_rds_instance", ChangeAction.DELETE, is_destructive=True)],
            env_label="prod",
        )
        assert result.score >= 65

    def test_unknown_env_uses_no_multiplier(self):
        unknown = score([_change(action=ChangeAction.UPDATE)], env_label="unknown")
        default = score([_change(action=ChangeAction.UPDATE)])
        assert unknown.score == default.score


# ── Sensitive attributes ───────────────────────────────────────────────────────


class TestSensitiveAttributes:
    def test_sensitive_change_has_minimum_score_40(self):
        result = score(
            [_change("custom_resource", ChangeAction.UPDATE, touches_sensitive=True, sensitive_paths=["password"])]
        )
        assert result.score >= 40

    def test_sensitive_bonus_applied(self):
        normal = score([_change("aws_rds_instance", ChangeAction.UPDATE)])
        sensitive = score(
            [_change("aws_rds_instance", ChangeAction.UPDATE, touches_sensitive=True, sensitive_paths=["password"])]
        )
        assert sensitive.score > normal.score

    def test_high_risk_attr_change_adds_bonus(self):
        normal = score([_change("aws_rds_instance", ChangeAction.UPDATE)])
        risky = score(
            [
                _change(
                    "aws_rds_instance",
                    ChangeAction.UPDATE,
                    before={"deletion_protection": True, "other": "val"},
                    after={"deletion_protection": False, "other": "val"},
                )
            ]
        )
        assert risky.score > normal.score


# ── S3 public access block removal ───────────────────────────────────────────


class TestS3PublicAccessBlock:
    def test_removing_public_access_block_adds_large_bonus(self):
        normal_update = score(
            [
                _change(
                    "aws_s3_bucket_public_access_block",
                    ChangeAction.UPDATE,
                    before={"block_public_acls": True},
                    after={"block_public_acls": True},
                )
            ]
        )
        critical_update = score(
            [
                _change(
                    "aws_s3_bucket_public_access_block",
                    ChangeAction.UPDATE,
                    before={"block_public_acls": True},
                    after={"block_public_acls": False},
                )
            ]
        )
        assert critical_update.score > normal_update.score


# ── Provider weights ──────────────────────────────────────────────────────────


class TestProviderWeights:
    def test_random_provider_scores_zero(self):
        result = score(
            [
                _change(
                    "random_id",
                    ChangeAction.CREATE,
                    provider="registry.terraform.io/hashicorp/random",
                )
            ]
        )
        assert result.score == 0

    def test_null_provider_scores_zero(self):
        result = score(
            [
                _change(
                    "null_resource",
                    ChangeAction.CREATE,
                    provider="registry.terraform.io/hashicorp/null",
                )
            ]
        )
        assert result.score == 0

    def test_kubernetes_has_lower_weight_than_aws(self):
        aws = score(
            [
                _change(
                    "aws_instance",
                    ChangeAction.DELETE,
                    is_destructive=True,
                    provider="registry.terraform.io/hashicorp/aws",
                )
            ]
        )
        k8s = score(
            [
                _change(
                    "kubernetes_deployment",
                    ChangeAction.DELETE,
                    is_destructive=True,
                    provider="registry.terraform.io/hashicorp/kubernetes",
                )
            ]
        )
        # The k8s deployment weight already differs — just confirm it's lower or equal than aws_instance
        # (aws_instance delete=30, k8s_deployment delete=25 × 0.8 = 20 → k8s < aws)
        assert k8s.score <= aws.score


# ── Multiple changes ──────────────────────────────────────────────────────────


class TestMultipleChanges:
    def test_multiple_changes_aggregate_score(self):
        single = score([_change("aws_s3_bucket", ChangeAction.DELETE, is_destructive=True)])
        multi = score(
            [
                _change("aws_s3_bucket", ChangeAction.DELETE, is_destructive=True),
                _change("aws_iam_role", ChangeAction.UPDATE),
            ]
        )
        assert multi.score >= single.score

    def test_score_capped_at_100(self):
        many = score(
            [
                _change("aws_rds_cluster", ChangeAction.DELETE, is_destructive=True),
                _change("aws_rds_instance", ChangeAction.DELETE, is_destructive=True),
                _change(
                    "aws_s3_bucket",
                    ChangeAction.DELETE,
                    is_destructive=True,
                    touches_sensitive=True,
                    sensitive_paths=["password"],
                ),
                _change("aws_kms_key", ChangeAction.DELETE, is_destructive=True),
                _change("aws_iam_policy", ChangeAction.DELETE, is_destructive=True),
            ]
        )
        assert many.score <= 100

    def test_total_changes_count_matches(self):
        changes = [
            _change("aws_s3_bucket", ChangeAction.CREATE),
            _change("aws_iam_role", ChangeAction.UPDATE),
        ]
        result = score(changes)
        assert result.total_changes == 2

    def test_score_factors_populated(self):
        result = score([_change("aws_s3_bucket", ChangeAction.DELETE, is_destructive=True)])
        assert result.score_factors  # non-empty

    def test_deterministic(self):
        changes = [
            _change("aws_rds_instance", ChangeAction.UPDATE),
            _change("aws_s3_bucket", ChangeAction.DELETE, is_destructive=True),
        ]
        r1 = score(changes)
        r2 = score(changes)
        assert r1.score == r2.score
        assert r1.level == r2.level
