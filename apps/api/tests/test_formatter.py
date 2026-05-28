from driftguard.ai.findings import Finding
from driftguard.ai.formatter import _esc, format_comment
from driftguard.workers.analyzer import _merge_findings


def test_format_comment_with_findings():
    findings = [
        Finding(
            type="cost",
            severity="high",
            resource="aws_db.x",
            message="monthly cost delta: $120",
            extra={"cents": 12000},
        ),
        Finding(
            type="security", severity="critical", resource="aws_s3.y", message="bucket is public", rule_id="CKV_AWS_2"
        ),
    ]
    body = format_comment(
        findings=findings,
        ai_review_md="## Summary\nLooks risky.",
        summary_meta={"duration_ms": 1200, "sha": "abc1234567890"},
    )
    assert "Driftguard review" in body
    assert "+120.00" in body
    assert "aws_s3.y" in body
    assert "abc1234" in body
    assert "1200ms" in body


def test_format_comment_empty():
    body = format_comment(
        findings=[],
        ai_review_md="## Summary\nNo material changes.",
        summary_meta={"duration_ms": 50, "sha": "deadbeef"},
    )
    assert "no change" in body
    assert "No material changes" in body


def test_format_comment_k8s_and_gha_sections():
    findings = [
        Finding(
            type="security",
            severity="high",
            resource="deployment/api",
            message="privileged container",
            rule_id="K8S002",
            suggestion="Set securityContext.privileged: false",
        ),
        Finding(
            type="security",
            severity="medium",
            resource=".github/workflows/ci.yml",
            message="third-party action pinned to mutable tag",
            rule_id="GHA003",
            suggestion="Pin action to a full commit SHA",
        ),
        Finding(
            type="security",
            severity="critical",
            resource="aws_s3.bucket",
            message="public bucket",
            rule_id="CKV_AWS_20",
        ),
    ]
    body = format_comment(
        findings=findings,
        ai_review_md="Needs attention.",
        summary_meta={"duration_ms": 300, "sha": "cafebabe"},
    )
    assert "Kubernetes security" in body
    assert "GitHub Actions security" in body
    assert "Terraform/IaC security" in body
    assert "K8s: 1" in body
    assert "GHA: 1" in body
    assert "TF: 1" in body
    assert "K8S002" in body
    assert "GHA003" in body
    assert "Pin action to a full commit SHA" in body


def test_format_comment_domain_counts_in_header():
    findings = [
        Finding(type="security", severity="high", resource="pod/x", message="root user", rule_id="K8S006"),
        Finding(type="security", severity="high", resource="pod/y", message="no limits", rule_id="K8S003"),
    ]
    body = format_comment(
        findings=findings,
        ai_review_md="Fix pod security.",
        summary_meta={"duration_ms": 100, "sha": "0000000"},
    )
    assert "K8s: 2" in body
    assert "Kubernetes security" in body
    assert "GitHub Actions security" not in body
    assert "Terraform/IaC security" not in body


def test_format_comment_live_aws_note():
    body = format_comment(
        findings=[],
        ai_review_md="Clean.",
        summary_meta={"duration_ms": 80, "sha": "aabbcc", "has_real_aws": True},
    )
    assert "live AWS drift" in body


def test_format_comment_no_live_aws_note_when_false():
    body = format_comment(
        findings=[],
        ai_review_md="Clean.",
        summary_meta={"duration_ms": 80, "sha": "aabbcc", "has_real_aws": False},
    )
    assert "live AWS drift" not in body


def test_format_comment_plan_changes_section():
    findings = [
        Finding(type="change", severity="high", resource="aws_instance.web", message="delete"),
        Finding(type="change", severity="low", resource="aws_sg.allow_all", message="create"),
    ]
    body = format_comment(
        findings=findings,
        ai_review_md="Plan.",
        summary_meta={"duration_ms": 50, "sha": "123"},
    )
    assert "Plan changes" in body
    assert "aws_instance.web" in body
    assert "**Changes:** 2" in body


def test_esc_slices_before_escaping():
    # pipe at position 5 in a 6-char string, limit=5 — pipe must be cut before escaping
    assert _esc("hello|x", 5) == "hello"
    # pipe within limit — should be escaped but not cause the slice to eat the backslash
    assert _esc("ab|cd", 10) == "ab\\|cd"
    # pipe exactly at limit boundary — should be excluded, not leave a dangling backslash
    result = _esc("a" * 9 + "|", 9)
    assert result == "a" * 9
    assert "\\" not in result


def test_merge_findings_partial_plan_keeps_uncovered_tf():
    # Static has TF findings for two resources; plan only covers resource A.
    # Resource B (not in plan) should be kept from static.
    static = [
        Finding(type="security", severity="high", resource="aws_s3.a", message="public", rule_id="TF003"),
        Finding(type="security", severity="high", resource="aws_s3.b", message="unencrypted", rule_id="TF005"),
    ]
    plan = [
        Finding(type="security", severity="critical", resource="aws_s3.a", message="checkov: public ACL", rule_id="CKV_AWS_20"),
    ]
    merged = _merge_findings(static, plan)
    resources = {f.resource for f in merged}
    # Plan finding for .a kept; static TF finding for .b kept (not covered by plan)
    assert "aws_s3.a" in resources
    assert "aws_s3.b" in resources
    # No duplicate for .a
    assert sum(1 for f in merged if f.resource == "aws_s3.a") == 1


def test_merge_findings_k8s_always_kept():
    static = [
        Finding(type="security", severity="high", resource="deploy/api", message="privileged", rule_id="K8S002"),
        Finding(type="security", severity="medium", resource="aws_sg.x", message="wide open", rule_id="TF007"),
    ]
    plan = [
        Finding(type="security", severity="high", resource="aws_sg.x", message="checkov hit", rule_id="CKV_AWS_25"),
    ]
    merged = _merge_findings(static, plan)
    rule_ids = {f.rule_id for f in merged}
    assert "K8S002" in rule_ids   # K8s always kept
    assert "CKV_AWS_25" in rule_ids  # plan finding kept
    assert "TF007" not in rule_ids   # TF static for covered resource dropped
