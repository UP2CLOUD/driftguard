"""Unit tests for pure helper functions in the ingest API module."""

from __future__ import annotations

from driftguard.api.v1.ingest import (
    _auto_fix_hint,
    _fingerprint,
    _recommended_action,
    _risk_score,
    _root_cause_hint,
    _title_from,
)

# ── _fingerprint ──────────────────────────────────────────────────────────────


class TestFingerprint:
    def test_returns_16_char_hex(self):
        fp = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        assert len(fp) == 16
        assert all(c in "0123456789abcdef" for c in fp)

    def test_deterministic(self):
        fp1 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        fp2 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        assert fp1 == fp2

    def test_different_event_type_changes_fingerprint(self):
        fp1 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        fp2 = _fingerprint("policy_blocked", "S3 bucket public", "acme/infra")
        assert fp1 != fp2

    def test_different_message_changes_fingerprint(self):
        fp1 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        fp2 = _fingerprint("drift_detected", "RDS deletion protection disabled", "acme/infra")
        assert fp1 != fp2

    def test_different_repo_changes_fingerprint(self):
        fp1 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        fp2 = _fingerprint("drift_detected", "S3 bucket public", "acme/backend")
        assert fp1 != fp2

    def test_none_repo_handled(self):
        fp = _fingerprint("drift_detected", "S3 bucket public", None)
        assert len(fp) == 16

    def test_message_normalised_case_insensitive(self):
        fp1 = _fingerprint("drift_detected", "S3 BUCKET PUBLIC", "acme/infra")
        fp2 = _fingerprint("drift_detected", "s3 bucket public", "acme/infra")
        assert fp1 == fp2

    def test_message_normalised_extra_whitespace(self):
        fp1 = _fingerprint("drift_detected", "S3  bucket   public", "acme/infra")
        fp2 = _fingerprint("drift_detected", "S3 bucket public", "acme/infra")
        assert fp1 == fp2

    def test_message_truncated_to_200_chars(self):
        long = "x" * 500
        short = "x" * 200
        fp1 = _fingerprint("drift_detected", long, "acme/infra")
        fp2 = _fingerprint("drift_detected", short, "acme/infra")
        assert fp1 == fp2


# ── _risk_score ───────────────────────────────────────────────────────────────


class TestRiskScore:
    def test_critical_base_is_1_0(self):
        assert _risk_score("critical", 1) == 1.0

    def test_high_base_is_0_75(self):
        score = _risk_score("high", 1)
        assert 0.7 <= score <= 0.8

    def test_warn_base_lower_than_high(self):
        assert _risk_score("warn", 1) < _risk_score("high", 1)

    def test_info_base_lowest(self):
        assert _risk_score("info", 1) < _risk_score("warn", 1)

    def test_unknown_severity_uses_default_weight(self):
        score = _risk_score("unknown_severity", 1)
        assert 0.0 < score <= 1.0

    def test_recurrence_boosts_score(self):
        low = _risk_score("high", 1)
        high = _risk_score("high", 5)
        assert high > low

    def test_score_capped_at_1_0(self):
        assert _risk_score("critical", 100) == 1.0

    def test_recurrence_boost_capped_at_0_2(self):
        score_many = _risk_score("info", 1000)
        score_five = _risk_score("info", 5)
        assert score_many == score_five  # boost maxes at 0.2

    def test_returns_float(self):
        assert isinstance(_risk_score("high", 1), float)

    def test_rounded_to_2_decimals(self):
        score = _risk_score("high", 3)
        assert score == round(score, 2)


# ── _recommended_action ───────────────────────────────────────────────────────


class TestRecommendedAction:
    def test_critical_always_block_and_review(self):
        assert _recommended_action("critical", False, 1) == "block_and_review"
        assert _recommended_action("critical", True, 5) == "block_and_review"

    def test_high_recurrence_gt_2_escalates(self):
        assert _recommended_action("high", False, 3) == "escalate_policy"
        assert _recommended_action("high", True, 10) == "escalate_policy"

    def test_high_low_recurrence_review_immediately(self):
        assert _recommended_action("high", False, 1) == "review_immediately"
        assert _recommended_action("high", True, 2) == "review_immediately"

    def test_incident_created_review_policy(self):
        assert _recommended_action("warn", True, 1) == "review_policy"

    def test_no_incident_monitor(self):
        assert _recommended_action("info", False, 1) == "monitor"

    def test_warn_no_incident_monitor(self):
        assert _recommended_action("warn", False, 1) == "monitor"


# ── _title_from ───────────────────────────────────────────────────────────────


class TestTitleFrom:
    def test_policy_blocked_prefix(self):
        title = _title_from("policy_blocked", "S3 public access block removed")
        assert title.startswith("Policy blocked:")

    def test_drift_detected_prefix(self):
        title = _title_from("drift_detected", "State diverged")
        assert title.startswith("Drift detected:")

    def test_security_finding_prefix(self):
        title = _title_from("security_finding", "IAM wildcard")
        assert title.startswith("Security finding:")

    def test_cost_alert_prefix(self):
        title = _title_from("cost_alert", "Budget exceeded")
        assert title.startswith("Cost alert:")

    def test_pr_opened_prefix(self):
        title = _title_from("pr_opened", "High-risk changes")
        assert title.startswith("Risky PR:")

    def test_unknown_event_type_title_cased(self):
        title = _title_from("custom_event_type", "Some message")
        assert "Custom Event Type" in title

    def test_message_truncated_to_80_chars(self):
        long_msg = "x" * 200
        title = _title_from("drift_detected", long_msg)
        assert len(title) <= len("Drift detected: ") + 80

    def test_message_included_in_title(self):
        title = _title_from("drift_detected", "S3 bucket exposed")
        assert "S3 bucket exposed" in title


# ── _root_cause_hint ──────────────────────────────────────────────────────────


class TestRootCauseHint:
    def test_policy_blocked_hint(self):
        hint = _root_cause_hint("policy_blocked")
        assert "policy" in hint.lower()

    def test_drift_detected_hint(self):
        hint = _root_cause_hint("drift_detected")
        assert "terraform" in hint.lower() or "drift" in hint.lower()

    def test_security_finding_hint(self):
        hint = _root_cause_hint("security_finding")
        assert "misconfiguration" in hint.lower() or "security" in hint.lower() or "insecure" in hint.lower()

    def test_cost_alert_hint(self):
        hint = _root_cause_hint("cost_alert")
        assert "cost" in hint.lower() or "budget" in hint.lower() or "threshold" in hint.lower()

    def test_pr_opened_hint(self):
        hint = _root_cause_hint("pr_opened")
        assert "pr" in hint.lower() or "agent" in hint.lower() or "high-risk" in hint.lower()

    def test_unknown_event_type_has_default(self):
        hint = _root_cause_hint("totally_unknown")
        assert isinstance(hint, str)
        assert len(hint) > 0


# ── _auto_fix_hint ────────────────────────────────────────────────────────────


class TestAutoFixHint:
    def test_public_s3_returns_hint(self):
        hint = _auto_fix_hint("drift_detected", "public s3 bucket exposed")
        assert hint is not None
        assert "S3" in hint or "s3" in hint.lower()

    def test_wildcard_iam_returns_hint(self):
        hint = _auto_fix_hint("security_finding", "IAM wildcard resource detected")
        assert hint is not None
        assert "wildcard" in hint.lower() or "arn" in hint.lower() or "iam" in hint.lower() or "restrict" in hint.lower()

    def test_rds_delete_returns_hint(self):
        hint = _auto_fix_hint("drift_detected", "delete rds instance prod")
        assert hint is not None
        assert "rds" in hint.lower() or "prevent_destroy" in hint.lower() or "database" in hint.lower()

    def test_ingress_open_returns_hint(self):
        hint = _auto_fix_hint("security_finding", "0.0.0.0/0 ingress port 22 open")
        assert hint is not None
        assert "cidr" in hint.lower() or "ingress" in hint.lower() or "security group" in hint.lower()

    def test_unrecognised_message_returns_none(self):
        hint = _auto_fix_hint("custom_event", "some random message with no pattern")
        assert hint is None

    def test_returns_string_or_none(self):
        hint = _auto_fix_hint("drift_detected", "something")
        assert hint is None or isinstance(hint, str)
