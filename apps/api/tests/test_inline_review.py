"""Tests for services/inline_review.py — inline PR comment mapping."""

from driftguard.ai.findings import Finding
from driftguard.services.inline_review import (
    MAX_INLINE_COMMENTS,
    DiffFile,
    build_inline_review,
    inline_comments_payload,
    parse_pr_files,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def make_finding(
    *,
    file: str | None = "main.tf",
    line: int | None = 5,
    severity: str = "high",
    rule_id: str | None = "TF001",
    message: str = "Test finding",
    suggestion: str | None = None,
    title: str | None = None,
    resource: str = "aws_s3_bucket.example",
) -> Finding:
    return Finding(
        type="security",
        severity=severity,
        resource=resource,
        message=message,
        suggestion=suggestion,
        rule_id=rule_id,
        file=file,
        line=line,
        title=title,
    )


def make_diff_file(filename: str, added_lines: list[int]) -> DiffFile:
    s = frozenset(added_lines)
    return DiffFile(filename=filename, added_lines=s, added_lines_sorted=tuple(sorted(s)))


# ── parse_pr_files ─────────────────────────────────────────────────────────────


def test_parse_patch_extracts_added_lines():
    # new-file line numbers: 1=context, 2=added, 3=context, -=deleted(no new), 4=added, 5=context
    patch = "@@ -1,4 +1,5 @@\n context\n+added line 2\n context\n-removed\n+added line 4\n context\n"
    files_json = [{"filename": "main.tf", "status": "modified", "patch": patch}]
    diff = parse_pr_files(files_json)
    assert "main.tf" in diff
    assert 2 in diff["main.tf"].added_lines
    assert 4 in diff["main.tf"].added_lines
    assert 1 not in diff["main.tf"].added_lines  # context line
    assert 3 not in diff["main.tf"].added_lines  # context line


def test_parse_pr_files_no_patch():
    files_json = [{"filename": "image.png", "status": "added"}]
    diff = parse_pr_files(files_json)
    assert diff["image.png"].added_lines == frozenset()


def test_parse_pr_files_multi_hunk():
    patch = "@@ -1,2 +1,3 @@\n ctx\n+line2\n ctx\n@@ -10,2 +11,3 @@\n ctx\n+line12\n ctx\n"
    files_json = [{"filename": "a.tf", "patch": patch}]
    diff = parse_pr_files(files_json)
    assert 2 in diff["a.tf"].added_lines
    assert 12 in diff["a.tf"].added_lines


# ── S3 ACL exact-line mapping ──────────────────────────────────────────────────


def test_s3_acl_exact_line_maps_inline():
    """Finding with line inside added_lines → inline comment at that exact line."""
    f = make_finding(file="modules/s3.tf", line=10, rule_id="TF013", severity="high")
    diff_files = {"modules/s3.tf": make_diff_file("modules/s3.tf", [8, 10, 12])}
    result = build_inline_review([f], diff_files)
    assert len(result.inline_comments) == 1
    assert result.inline_comments[0].line == 10
    assert result.inline_comments[0].path == "modules/s3.tf"
    assert "DriftGuard finding:" in result.inline_comments[0].body
    assert not result.unmapped_findings


# ── IAM wildcard nearest-line fallback ────────────────────────────────────────


def test_iam_wildcard_nearest_line_fallback():
    """Finding whose line is NOT in diff → maps to nearest added line within 15 lines."""
    f = make_finding(file="iam.tf", line=20, rule_id="TF001", severity="critical")
    diff_files = {"iam.tf": make_diff_file("iam.tf", [15, 25])}
    result = build_inline_review([f], diff_files)
    assert len(result.inline_comments) == 1
    assert result.inline_comments[0].line in {15, 25}  # both equidistant (5 lines each)
    assert not result.unmapped_findings


def test_nearest_line_too_far_goes_unmapped():
    """Finding line more than MAX_LINE_DISTANCE (15) from any added line → unmapped."""
    f = make_finding(file="iam.tf", line=50, rule_id="TF001", severity="high")
    diff_files = {"iam.tf": make_diff_file("iam.tf", [5, 10])}
    result = build_inline_review([f], diff_files)
    assert not result.inline_comments
    assert f in result.unmapped_findings


# ── GHA secret: no line, high sev → first added line ──────────────────────────


def test_gha_secret_no_line_high_severity_uses_first_added():
    """Finding without line number at high severity → uses first added line in file."""
    f = make_finding(file=".github/workflows/ci.yml", line=None, severity="high", rule_id="GHA001")
    diff_files = {".github/workflows/ci.yml": make_diff_file(".github/workflows/ci.yml", [7, 12, 20])}
    result = build_inline_review([f], diff_files)
    assert len(result.inline_comments) == 1
    assert result.inline_comments[0].line == 7


def test_no_line_medium_severity_goes_unmapped():
    """Finding without line number at medium severity → unmapped (not enough signal)."""
    f = make_finding(file="main.tf", line=None, severity="medium", rule_id="TF002")
    diff_files = {"main.tf": make_diff_file("main.tf", [5, 10])}
    result = build_inline_review([f], diff_files)
    assert not result.inline_comments
    assert f in result.unmapped_findings


# ── Unmapped → summary ────────────────────────────────────────────────────────


def test_finding_not_in_diff_goes_unmapped():
    """Finding whose file is not in the PR diff → unmapped."""
    f = make_finding(file="unrelated/old.tf", line=5, severity="high")
    diff_files = {"main.tf": make_diff_file("main.tf", [5])}
    result = build_inline_review([f], diff_files)
    assert not result.inline_comments
    assert f in result.unmapped_findings


def test_finding_no_file_goes_unmapped():
    """Finding with no file → always unmapped."""
    f = make_finding(file=None, line=None, severity="critical")
    result = build_inline_review([f], {})
    assert f in result.unmapped_findings


# ── Deduplication ─────────────────────────────────────────────────────────────


def test_duplicate_rule_file_line_deduplicated():
    """Two findings with same rule_id + file + resolved line → only one comment."""
    f1 = make_finding(file="main.tf", line=5, rule_id="TF001", severity="high")
    f2 = make_finding(file="main.tf", line=5, rule_id="TF001", severity="high", message="Dupe")
    diff_files = {"main.tf": make_diff_file("main.tf", [5])}
    result = build_inline_review([f1, f2], diff_files)
    assert len(result.inline_comments) == 1
    assert len(result.skipped_findings) == 1


def test_different_rule_same_location_not_deduplicated():
    """Different rule_id at same file+line → two separate comments."""
    f1 = make_finding(file="main.tf", line=5, rule_id="TF001", severity="high")
    f2 = make_finding(file="main.tf", line=5, rule_id="TF013", severity="high")
    diff_files = {"main.tf": make_diff_file("main.tf", [5])}
    result = build_inline_review([f1, f2], diff_files)
    assert len(result.inline_comments) == 2


# ── Cap at 20 ─────────────────────────────────────────────────────────────────


def test_inline_comments_capped_at_max():
    """21 valid findings → 20 inline + 1 skipped."""
    findings = [make_finding(file="main.tf", line=i, rule_id=f"TF{i:03d}", severity="high") for i in range(1, 22)]
    diff_files = {"main.tf": make_diff_file("main.tf", list(range(1, 22)))}
    result = build_inline_review(findings, diff_files)
    assert len(result.inline_comments) == MAX_INLINE_COMMENTS
    assert len(result.skipped_findings) == 1


def test_severity_priority_fills_cap():
    """When capped, critical findings take precedence over medium."""
    critical = [make_finding(file="main.tf", line=i, rule_id=f"CRIT{i}", severity="critical") for i in range(1, 6)]
    medium = [make_finding(file="main.tf", line=i + 100, rule_id=f"MED{i}", severity="medium") for i in range(1, 20)]
    added = list(range(1, 6)) + list(range(101, 120))
    diff_files = {"main.tf": make_diff_file("main.tf", added)}
    result = build_inline_review(critical + medium, diff_files, max_comments=5)
    # All 5 slots should be the critical findings
    severities = {c.severity for c in result.inline_comments}
    assert severities == {"critical"}


# ── Generated/vendor file filtering ──────────────────────────────────────────


def test_lock_file_finding_skipped():
    """Finding in a lock file → skipped (not inline, not unmapped)."""
    f = make_finding(file="yarn.lock", line=5, severity="high")
    diff_files = {"yarn.lock": make_diff_file("yarn.lock", [5])}
    result = build_inline_review([f], diff_files)
    assert not result.inline_comments
    assert f in result.skipped_findings
    assert f not in result.unmapped_findings


def test_node_modules_finding_skipped():
    f = make_finding(file="node_modules/pkg/index.js", line=3, severity="medium")
    diff_files = {"node_modules/pkg/index.js": make_diff_file("node_modules/pkg/index.js", [3])}
    result = build_inline_review([f], diff_files)
    assert not result.inline_comments
    assert f in result.skipped_findings


def test_critical_in_lock_file_still_inline():
    """Critical severity bypasses the vendor/lock skip filter."""
    f = make_finding(file="yarn.lock", line=5, severity="critical", rule_id="TF001")
    diff_files = {"yarn.lock": make_diff_file("yarn.lock", [5])}
    result = build_inline_review([f], diff_files)
    assert len(result.inline_comments) == 1


# ── inline_comments_payload ───────────────────────────────────────────────────


def test_payload_structure():
    """inline_comments_payload returns dicts with path/line/side/body keys."""
    f = make_finding(
        file="main.tf", line=5, rule_id="TF001", severity="high", title="IAM wildcard", suggestion="Use specific ARNs"
    )
    diff_files = {"main.tf": make_diff_file("main.tf", [5])}
    result = build_inline_review([f], diff_files)
    payload = inline_comments_payload(result)
    assert len(payload) == 1
    p = payload[0]
    assert p["path"] == "main.tf"
    assert p["line"] == 5
    assert p["side"] == "RIGHT"
    assert "DriftGuard finding:" in p["body"]
    assert "IAM wildcard" in p["body"]
    assert "Use specific ARNs" in p["body"]
