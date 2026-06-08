"""PR inline review: map findings to valid diff lines, build GitHub PR review payload."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field

from driftguard.ai.findings import Finding

MAX_INLINE_COMMENTS = 20
MAX_LINE_DISTANCE = 15  # beyond this, nearest-line fallback is misleading

_SEV_ORDER: dict[str, int] = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

_SKIP_PATH_RE = re.compile(
    r"(^|/)(node_modules|vendor|dist|build|coverage|target|\.git)/"
    r"|"
    r"(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock"
    r"|Pipfile\.lock|go\.sum|Cargo\.lock)$",
    re.IGNORECASE,
)

_HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


@dataclass
class DiffFile:
    filename: str
    added_lines: frozenset[int] = field(default_factory=frozenset)
    added_lines_sorted: tuple[int, ...] = field(default_factory=tuple)


@dataclass
class InlineComment:
    path: str
    line: int
    side: str
    body: str
    severity: str


@dataclass
class InlineReviewResult:
    inline_comments: list[InlineComment]
    unmapped_findings: list[Finding]
    skipped_findings: list[Finding]


def _parse_patch(patch: str) -> frozenset[int]:
    """Return new-file line numbers for '+' (added) lines in a unified diff patch."""
    added: set[int] = set()
    new_line = 0
    for raw in patch.splitlines():
        m = _HUNK_RE.match(raw)
        if m:
            new_line = int(m.group(1))
            continue
        if new_line == 0:
            continue
        if raw.startswith("+"):
            added.add(new_line)
            new_line += 1
        elif raw.startswith("-"):
            pass  # deleted — no new-file line number
        else:
            new_line += 1  # context line
    return frozenset(added)


def parse_pr_files(files_json: list[dict]) -> dict[str, DiffFile]:
    """Parse GitHub PR files API response → {filename: DiffFile}."""
    result: dict[str, DiffFile] = {}
    for f in files_json:
        filename = f.get("filename", "")
        if not filename:
            continue
        patch = f.get("patch", "")
        added = _parse_patch(patch) if patch else frozenset()
        result[filename] = DiffFile(
            filename=filename,
            added_lines=added,
            added_lines_sorted=tuple(sorted(added)),
        )
    return result


def _is_skippable(path: str) -> bool:
    return bool(_SKIP_PATH_RE.search(path))


def _nearest_added_line(diff_file: DiffFile, target: int) -> int | None:
    candidates = diff_file.added_lines_sorted
    if not candidates:
        return None
    lo, hi = 0, len(candidates) - 1
    best, best_dist = candidates[0], abs(candidates[0] - target)
    while lo <= hi:
        mid = (lo + hi) // 2
        dist = abs(candidates[mid] - target)
        if dist < best_dist:
            best_dist = dist
            best = candidates[mid]
        if candidates[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return best if best_dist <= MAX_LINE_DISTANCE else None


def _comment_body(f: Finding) -> str:
    title = f.title or (f.message[:60] if len(f.message) > 60 else f.message)
    explanation = f.message
    if f.resource and f.resource not in explanation:
        explanation = f"`{f.resource}`: {explanation}"
    fix = f.suggestion or "Review and apply secure defaults or least-privilege access."
    rule_note = f"\n\n<sub>Rule: `{f.rule_id}`</sub>" if f.rule_id else ""
    return (
        f"**DriftGuard finding:** {title}\n\n"
        f"{explanation}\n\n"
        f"**Suggested fix:** {fix}"
        f"{rule_note}"
    )


def _dedup_key(path: str, line: int, f: Finding) -> str:
    rule = f.rule_id or hashlib.md5(f.message[:100].encode(), usedforsecurity=False).hexdigest()[:8]
    return f"{path}:{line}:{rule}"


def build_inline_review(
    findings: list[Finding],
    diff_files: dict[str, DiffFile],
    *,
    max_comments: int = MAX_INLINE_COMMENTS,
) -> InlineReviewResult:
    """Map findings to valid diff lines. Returns inline comments, unmapped, and skipped."""
    sorted_findings = sorted(findings, key=lambda f: _SEV_ORDER.get(f.severity, 99))

    seen: set[str] = set()
    inline: list[InlineComment] = []
    unmapped: list[Finding] = []
    skipped: list[Finding] = []

    for f in sorted_findings:
        if not f.file:
            unmapped.append(f)
            continue

        if f.severity != "critical" and _is_skippable(f.file):
            skipped.append(f)
            continue

        diff_file = diff_files.get(f.file)
        if diff_file is None:
            unmapped.append(f)
            continue

        # Resolve to a valid commentable line
        target_line: int | None = None
        if f.line and f.line in diff_file.added_lines:
            target_line = f.line
        elif f.line:
            target_line = _nearest_added_line(diff_file, f.line)
        elif f.severity in ("critical", "high") and diff_file.added_lines_sorted:
            target_line = diff_file.added_lines_sorted[0]

        if target_line is None:
            unmapped.append(f)
            continue

        if len(inline) >= max_comments:
            skipped.append(f)
            continue

        dk = _dedup_key(f.file, target_line, f)
        if dk in seen:
            skipped.append(f)
            continue
        seen.add(dk)

        inline.append(InlineComment(
            path=f.file,
            line=target_line,
            side="RIGHT",
            body=_comment_body(f),
            severity=f.severity,
        ))

    return InlineReviewResult(
        inline_comments=inline,
        unmapped_findings=unmapped,
        skipped_findings=skipped,
    )


def inline_comments_payload(result: InlineReviewResult) -> list[dict]:
    """Convert InlineReviewResult to GitHub API comments list."""
    return [
        {"path": c.path, "line": c.line, "side": c.side, "body": c.body}
        for c in result.inline_comments
    ]
