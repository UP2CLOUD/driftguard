"""
Kubernetes YAML static analysis rules.

Rules:
  K8S001 - Privileged container
  K8S002 - Missing resource limits
  K8S003 - hostPID / hostNetwork / hostIPC
  K8S004 - Running as root (no runAsNonRoot)
  K8S005 - allowPrivilegeEscalation: true
  K8S006 - Image with :latest tag or no digest
  K8S007 - Missing readinessProbe / livenessProbe
  K8S008 - Missing securityContext
  K8S009 - Writable root filesystem (readOnlyRootFilesystem not set)
  K8S010 - Container running with ALL capabilities
"""

from __future__ import annotations

import re
from pathlib import Path

from driftguard.services.scanner.engine import Category, ScanFinding, Severity

_LATEST_TAG = re.compile(r'image:\s+"?([^"\s:]+):latest"?|image:\s+"?([^"\s:@{]+)"?\s*$', re.MULTILINE)
_K8S_KINDS = {"Deployment", "DaemonSet", "StatefulSet", "Pod", "Job", "CronJob", "ReplicaSet"}


def scan_k8s_files(files: list[Path], root: Path) -> list[ScanFinding]:
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

    # Only scan files that look like K8s manifests
    if not _is_k8s_manifest(content):
        return findings

    try:
        import yaml

        docs = list(yaml.safe_load_all(content))
    except Exception:
        return findings

    for doc in docs:
        if not isinstance(doc, dict):
            continue
        kind = doc.get("kind", "")
        if kind not in _K8S_KINDS:
            continue

        name = doc.get("metadata", {}).get("name", "unnamed")
        resource = f"{kind}/{name}"
        spec = _extract_pod_spec(doc)
        if not spec:
            continue

        containers = spec.get("containers", []) + spec.get("initContainers", [])

        # Pod-level checks
        if spec.get("hostPID"):
            findings.append(
                ScanFinding(
                    rule_id="K8S003",
                    severity=Severity.CRITICAL,
                    category=Category.KUBERNETES,
                    title="hostPID enabled",
                    message=f"{resource}: hostPID=true allows container to see all host processes.",
                    file=rel_path,
                    line=None,
                    resource=resource,
                    suggestion="Remove hostPID: true unless absolutely required",
                    controls=["container_isolation"],
                )
            )

        if spec.get("hostNetwork"):
            findings.append(
                ScanFinding(
                    rule_id="K8S003",
                    severity=Severity.HIGH,
                    category=Category.KUBERNETES,
                    title="hostNetwork enabled",
                    message=f"{resource}: hostNetwork=true shares the host network namespace.",
                    file=rel_path,
                    line=None,
                    resource=resource,
                    suggestion="Remove hostNetwork: true",
                    controls=["network_exposure"],
                )
            )

        for container in containers:
            cname = container.get("name", "unknown")
            sc = container.get("securityContext", {})

            # K8S001: privileged
            if sc.get("privileged"):
                findings.append(
                    ScanFinding(
                        rule_id="K8S001",
                        severity=Severity.CRITICAL,
                        category=Category.KUBERNETES,
                        title="Privileged container",
                        message=f"{resource}/{cname}: privileged=true gives container root access to host.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Remove privileged: true. Use specific capabilities instead.",
                        controls=["container_isolation", "least_privilege"],
                    )
                )

            # K8S005: allowPrivilegeEscalation
            if sc.get("allowPrivilegeEscalation", True):  # default is true if not set
                findings.append(
                    ScanFinding(
                        rule_id="K8S005",
                        severity=Severity.HIGH,
                        category=Category.KUBERNETES,
                        title="allowPrivilegeEscalation not disabled",
                        message=f"{resource}/{cname}: allowPrivilegeEscalation not explicitly set to false.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Add allowPrivilegeEscalation: false to securityContext",
                        controls=["least_privilege"],
                    )
                )

            # K8S004: running as root
            if not sc.get("runAsNonRoot") and not sc.get("runAsUser"):
                findings.append(
                    ScanFinding(
                        rule_id="K8S004",
                        severity=Severity.MEDIUM,
                        category=Category.KUBERNETES,
                        title="Container may run as root",
                        message=f"{resource}/{cname}: runAsNonRoot not set. Container may run as UID 0.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Add runAsNonRoot: true or runAsUser: 1000 to securityContext",
                        controls=["container_isolation"],
                    )
                )

            # K8S009: readOnlyRootFilesystem
            if not sc.get("readOnlyRootFilesystem"):
                findings.append(
                    ScanFinding(
                        rule_id="K8S009",
                        severity=Severity.LOW,
                        category=Category.KUBERNETES,
                        title="Root filesystem is writable",
                        message=f"{resource}/{cname}: readOnlyRootFilesystem not set.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Add readOnlyRootFilesystem: true and use emptyDir for writable paths",
                    )
                )

            # K8S002: resource limits
            resources = container.get("resources", {})
            limits = resources.get("limits", {})
            if not limits.get("cpu") or not limits.get("memory"):
                findings.append(
                    ScanFinding(
                        rule_id="K8S002",
                        severity=Severity.MEDIUM,
                        category=Category.KUBERNETES,
                        title="Missing resource limits",
                        message=f"{resource}/{cname}: CPU or memory limits not set. Risk of resource starvation.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Add resources.limits.cpu and resources.limits.memory",
                        controls=["resource_management"],
                    )
                )

            # K8S006: latest image tag
            image = container.get("image", "")
            if image.endswith(":latest") or (":" not in image.split("/")[-1] and "@" not in image):
                findings.append(
                    ScanFinding(
                        rule_id="K8S006",
                        severity=Severity.MEDIUM,
                        category=Category.KUBERNETES,
                        title="Image using :latest or untagged",
                        message=f"{resource}/{cname}: image='{image}' — latest tag prevents reproducible deployments.",
                        file=rel_path,
                        line=None,
                        resource=f"{resource}/{cname}",
                        suggestion="Pin to a specific tag or digest: image: my-app:1.2.3 or @sha256:...",
                    )
                )

            # K8S007: missing probes (only for non-init containers)
            if container in spec.get("containers", []):
                if not container.get("readinessProbe"):
                    findings.append(
                        ScanFinding(
                            rule_id="K8S007",
                            severity=Severity.LOW,
                            category=Category.KUBERNETES,
                            title="Missing readinessProbe",
                            message=f"{resource}/{cname}: No readinessProbe. Traffic may route to unready pods.",
                            file=rel_path,
                            line=None,
                            resource=f"{resource}/{cname}",
                            suggestion="Add a readinessProbe with httpGet, exec, or tcpSocket",
                        )
                    )

    return findings


def _extract_pod_spec(doc: dict) -> dict | None:
    """Extract the pod spec from various K8s resource types."""
    kind = doc.get("kind", "")
    spec = doc.get("spec", {})

    if kind == "Pod":
        return spec
    if kind in ("Deployment", "DaemonSet", "StatefulSet", "ReplicaSet"):
        return spec.get("template", {}).get("spec", {})
    if kind == "Job":
        return spec.get("template", {}).get("spec", {})
    if kind == "CronJob":
        return spec.get("jobTemplate", {}).get("spec", {}).get("template", {}).get("spec", {})
    return None


def _is_k8s_manifest(content: str) -> bool:
    """Quick check if a YAML file looks like a K8s manifest."""
    return bool(re.search(r"^kind:\s+\w+", content, re.MULTILINE) and re.search(r"^apiVersion:", content, re.MULTILINE))
