"""
Static IaC scanner engine.

Scans a directory tree for:
  - Terraform (.tf) files
  - Kubernetes YAML manifests
  - GitHub Actions workflow files

Returns a list of ScanFinding objects — deterministic, reproducible.
No network calls, no external tools required.

Usage:
    results = await scan_directory(Path("/path/to/iac"))
    for finding in results.findings:
        print(finding.rule_id, finding.severity, finding.message)
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path

log = logging.getLogger(__name__)


class Severity(StrEnum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Category(StrEnum):
    IAM = "iam"
    NETWORK = "network"
    ENCRYPTION = "encryption"
    STORAGE = "storage"
    COMPUTE = "compute"
    SECRETS = "secrets"
    KUBERNETES = "kubernetes"
    GITHUB_ACTIONS = "github_actions"
    BEST_PRACTICE = "best_practice"


@dataclass
class ScanFinding:
    rule_id: str
    severity: Severity
    category: Category
    title: str
    message: str
    file: str
    line: int | None
    resource: str | None = None
    suggestion: str | None = None
    docs_url: str | None = None
    controls: list[str] = field(default_factory=list)


@dataclass
class ScanResult:
    directory: str
    findings: list[ScanFinding] = field(default_factory=list)
    files_scanned: int = 0
    tf_files: int = 0
    k8s_files: int = 0
    gha_files: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def critical(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.CRITICAL)

    @property
    def high(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.HIGH)

    @property
    def medium(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.MEDIUM)

    @property
    def low(self) -> int:
        return sum(1 for f in self.findings if f.severity == Severity.LOW)

    @property
    def risk_score(self) -> int:
        """0-100 risk score from findings."""
        weights = {Severity.CRITICAL: 40, Severity.HIGH: 20, Severity.MEDIUM: 8, Severity.LOW: 2}
        total = sum(weights.get(f.severity, 0) for f in self.findings)
        return min(100, total)


async def scan_directory(root: Path) -> ScanResult:
    """
    Recursively scan a directory for IaC files and apply all rules.
    Returns a ScanResult with all findings.
    """
    from driftguard.services.scanner.rules.github_actions import scan_gha_files
    from driftguard.services.scanner.rules.kubernetes import scan_k8s_files
    from driftguard.services.scanner.rules.terraform import scan_tf_files

    result = ScanResult(directory=str(root))

    if not root.exists():
        result.errors.append(f"Directory not found: {root}")
        return result

    # Collect files by type.
    #
    # Classification is judged from each file's own path rather than from the
    # scan root or a substring of the absolute path. The previous check used
    # `".github" not in str(f.parent)`, which tests the *absolute* path: a
    # checkout under any directory containing ".github" would have silently
    # excluded every YAML file from the Kubernetes scan. The CLI carried a
    # matching root-relative bug that misfiled workflows as Kubernetes.
    def _is_workflow(path: Path) -> bool:
        parent = path.parent
        return parent.name == "workflows" and parent.parent.name == ".github"

    def _under_dot_github(path: Path, base: Path) -> bool:
        try:
            return ".github" in path.relative_to(base).parts
        except ValueError:
            return ".github" in path.parts

    tf_files = list(root.rglob("*.tf"))
    yaml_files = list(root.rglob("*.yaml")) + list(root.rglob("*.yml"))
    gha_files = [f for f in yaml_files if _is_workflow(f)]
    # Other .github config (dependabot, issue templates) is neither.
    k8s_files = [f for f in yaml_files if not _under_dot_github(f, root)]

    result.tf_files = len(tf_files)
    result.k8s_files = len(k8s_files)
    result.gha_files = len(gha_files)
    result.files_scanned = result.tf_files + result.k8s_files + result.gha_files

    # Run scanners in parallel
    tf_task = asyncio.to_thread(scan_tf_files, tf_files, root)
    k8s_task = asyncio.to_thread(scan_k8s_files, k8s_files, root)
    gha_task = asyncio.to_thread(scan_gha_files, gha_files, root)

    tf_findings, k8s_findings, gha_findings = await asyncio.gather(
        tf_task,
        k8s_task,
        gha_task,
        return_exceptions=True,
    )

    for r in (tf_findings, k8s_findings, gha_findings):
        if isinstance(r, BaseException):
            # BaseException, not Exception: gather(return_exceptions=True) can
            # hand back CancelledError, which would otherwise fall through to
            # the unpack below and raise a confusing TypeError.
            log.warning("scanner.error", extra={"error": str(r)})
            result.errors.append(str(r))
        else:
            # Each scanner returns (findings, per-file errors). Those errors
            # used to be discarded inside the scanner, so an unreadable file
            # looked identical to a clean one.
            file_findings, file_errors = r
            result.findings.extend(file_findings)
            for err in file_errors:
                log.warning("scanner.file_error", extra={"error": err})
            result.errors.extend(file_errors)
            # Don't claim to have scanned a file we could not read.
            result.files_scanned -= len(file_errors)

    log.info(
        "scanner.complete",
        extra={
            "directory": str(root),
            "files": result.files_scanned,
            "findings": len(result.findings),
            "critical": result.critical,
            "high": result.high,
        },
    )
    return result


def scan_directory_sync(root: Path) -> ScanResult:
    """Synchronous wrapper for use in Celery tasks."""
    return asyncio.run(scan_directory(root))
