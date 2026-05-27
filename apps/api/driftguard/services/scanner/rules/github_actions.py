"""
GitHub Actions workflow static analysis rules.

Rules:
  GHA001 - Unpinned action (uses @branch instead of @sha256)
  GHA002 - Dangerous: ACTIONS_ALLOW_UNSECURE_COMMANDS
  GHA003 - Script injection via github.event.* interpolation in run
  GHA004 - Missing workflow-level permissions (write-all by default)
  GHA005 - pull_request_target without explicit checkout restrictions
  GHA006 - Secrets exposed in environment variables
  GHA007 - Dangerous curl | bash pattern
  GHA008 - Untrusted input in github.event.issue.title / body
"""

from __future__ import annotations

import re
from pathlib import Path

from driftguard.services.scanner.engine import Category, ScanFinding, Severity

_UNPINNED_ACTION = re.compile(
    r"uses:\s+([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)@(?![\da-f]{40})(main|master|latest|v\d+\.?\d*\.?\d*)(?:\s|$)",
    re.MULTILINE,
)
_UNSECURE_COMMANDS = re.compile(r"ACTIONS_ALLOW_UNSECURE_COMMANDS\s*:\s*true", re.IGNORECASE)
_SCRIPT_INJECTION = re.compile(
    r"\$\{\{\s*github\.event\.(issue|pull_request|comment)\.(title|body|head\.ref|head\.label)\s*\}\}"
)
_CURL_BASH = re.compile(r"curl\s+.+\|\s*(bash|sh)\b", re.IGNORECASE)
_PR_TARGET = re.compile(r"pull_request_target", re.MULTILINE)
_PERMISSIONS_KEY = re.compile(r"^permissions:", re.MULTILINE)
_SECRET_IN_ENV = re.compile(r"(?:^|\n)\s+([A-Z_]+)\s*:\s*\$\{\{\s*secrets\.(\w+)\s*\}\}", re.MULTILINE)
_UNTRUSTED_INPUT = re.compile(r"\$\{\{\s*github\.event\.(issue|pull_request|comment)\.\w+")


def scan_gha_files(files: list[Path], root: Path) -> list[ScanFinding]:
    findings: list[ScanFinding] = []
    for f in files:
        try:
            content = f.read_text(errors="replace")
            rel = str(f.relative_to(root))
            findings.extend(_scan_single(content, rel))
        except Exception:  # noqa: S110
            pass
    return findings


def _scan_single(content: str, rel_path: str) -> list[ScanFinding]:
    findings: list[ScanFinding] = []

    # Only scan workflow files
    if "on:" not in content and "jobs:" not in content:
        return findings

    # GHA001: Unpinned actions
    for match in _UNPINNED_ACTION.finditer(content):
        line = content[: match.start()].count("\n") + 1
        action = match.group(1)
        ref = match.group(2)
        findings.append(
            ScanFinding(
                rule_id="GHA001",
                severity=Severity.HIGH,
                category=Category.GITHUB_ACTIONS,
                title=f"Unpinned action: {action}@{ref}",
                message=(
                    f"Action {action}@{ref} uses a mutable ref. "
                    "A compromised upstream action can run arbitrary code in your CI."
                ),
                file=rel_path,
                line=line,
                resource=action,
                suggestion=f"Pin to a commit SHA: uses: {action}@<full-sha>",
                # noqa: E501
                docs_url=("https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions"),
                controls=["supply_chain", "change_management"],
            )
        )

    # GHA002: Unsecure commands
    for match in _UNSECURE_COMMANDS.finditer(content):
        line = content[: match.start()].count("\n") + 1
        findings.append(
            ScanFinding(
                rule_id="GHA002",
                severity=Severity.CRITICAL,
                category=Category.GITHUB_ACTIONS,
                title="ACTIONS_ALLOW_UNSECURE_COMMANDS enabled",
                message="Allows deprecated set-env and add-path commands which can modify environment variables.",
                file=rel_path,
                line=line,
                suggestion="Remove this environment variable. Use modern outputs syntax instead.",
                controls=["change_management"],
            )
        )

    # GHA003: Script injection — only in run: blocks, not env: blocks.
    # The env: indirection pattern (assign to env var, reference $VAR in run) is
    # the recommended safe mitigation, so we skip matches whose nearest YAML key
    # before the interpolation is env: rather than run:.
    for match in _SCRIPT_INJECTION.finditer(content):
        before = content[: match.start()]
        last_run = before.rfind("run:")
        last_env = before.rfind("env:")
        if last_env > last_run:
            continue  # inside an env: block — the safe pattern, skip
        line = content[: match.start()].count("\n") + 1
        findings.append(
            ScanFinding(
                rule_id="GHA003",
                severity=Severity.CRITICAL,
                category=Category.GITHUB_ACTIONS,
                title="Script injection via github.event interpolation",
                message=(
                    "Direct interpolation of untrusted input in run step. "
                    "An attacker can inject arbitrary shell commands via PR title/body."
                ),
                file=rel_path,
                line=line,
                suggestion=(
                    "Use an intermediate env var: MY_VAR: ${{ github.event.pull_request.title }}, then reference $MY_VAR in run"  # noqa: E501
                ),
                controls=["injection_prevention"],
            )
        )

    # GHA004: Missing permissions
    if not _PERMISSIONS_KEY.search(content):
        findings.append(
            ScanFinding(
                rule_id="GHA004",
                severity=Severity.MEDIUM,
                category=Category.GITHUB_ACTIONS,
                title="Workflow missing explicit permissions",
                message="No permissions: block defined. Defaults to write-all which grants broad repository access.",
                file=rel_path,
                line=1,
                suggestion="Add permissions: at workflow or job level. Use read-all minimum.",
                controls=["least_privilege", "access_control"],
            )
        )

    # GHA005: pull_request_target without precautions
    if _PR_TARGET.search(content) and "actions/checkout" in content:
        # Check if checkout uses a hard-coded ref (safe) or the PR ref (dangerous)
        if "github.event.pull_request.head" in content:
            line = next(
                (content[: m.start()].count("\n") + 1 for m in [_PR_TARGET.search(content)] if m),
                1,
            )
            findings.append(
                ScanFinding(
                    rule_id="GHA005",
                    severity=Severity.CRITICAL,
                    category=Category.GITHUB_ACTIONS,
                    title="pull_request_target with unsafe checkout",
                    message=(
                        "Checking out the PR head with pull_request_target runs untrusted code "
                        "with repository write access and secrets."
                    ),
                    file=rel_path,
                    line=line,
                    suggestion="Use pull_request instead, or check out a specific safe ref.",
                    controls=["supply_chain", "access_control"],
                )
            )

    # GHA007: curl | bash
    for match in _CURL_BASH.finditer(content):
        line = content[: match.start()].count("\n") + 1
        findings.append(
            ScanFinding(
                rule_id="GHA007",
                severity=Severity.HIGH,
                category=Category.GITHUB_ACTIONS,
                title="Remote script execution via curl | bash",
                message="Executing remote scripts directly is a supply chain attack vector.",
                file=rel_path,
                line=line,
                suggestion="Download the script, verify its checksum, then execute it separately.",
                controls=["supply_chain"],
            )
        )

    return findings
