from driftguard.ai.findings import Finding
from driftguard.ai.formatter import format_comment


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
