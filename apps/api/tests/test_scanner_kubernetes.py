"""Tests for Kubernetes static analysis rules (K8S001–K8S009)."""
import pytest
from driftguard.services.scanner.rules.kubernetes import _scan_single

# ── helpers ──────────────────────────────────────────────────────────────────

def rule_ids(content: str) -> set[str]:
    return {f.rule_id for f in _scan_single(content, "deploy.yaml")}


def assert_triggers(rule: str, content: str):
    assert rule in rule_ids(content), f"{rule} should fire on:\n{content}"


def assert_passes(rule: str, content: str):
    assert rule not in rule_ids(content), f"{rule} should NOT fire on:\n{content}"


# ── minimal safe Deployment (all security best-practices applied) ────────────

_SAFE_DEPLOYMENT = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: safe-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.2.3
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            privileged: false
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            readOnlyRootFilesystem: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""


# ── K8S001: Privileged container ─────────────────────────────────────────────

def test_k8s001_privileged_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: priv-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            privileged: true
            allowPrivilegeEscalation: false
            runAsNonRoot: true
            readOnlyRootFilesystem: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""
    assert_triggers("K8S001", content)

def test_k8s001_non_privileged_passes():
    assert_passes("K8S001", _SAFE_DEPLOYMENT)


# ── K8S002: Missing resource limits ──────────────────────────────────────────

def test_k8s002_no_limits_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
"""
    assert_triggers("K8S002", content)

def test_k8s002_only_cpu_limit_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
"""
    assert_triggers("K8S002", content)

def test_k8s002_both_limits_passes():
    assert_passes("K8S002", _SAFE_DEPLOYMENT)


# ── K8S003: hostPID / hostNetwork ────────────────────────────────────────────

def test_k8s003_hostpid_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      hostPID: true
      containers:
        - name: app
          image: myrepo/app:1.0.0
"""
    assert_triggers("K8S003", content)

def test_k8s003_hostnetwork_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      hostNetwork: true
      containers:
        - name: app
          image: myrepo/app:1.0.0
"""
    assert_triggers("K8S003", content)

def test_k8s003_no_host_sharing_passes():
    assert_passes("K8S003", _SAFE_DEPLOYMENT)


# ── K8S004: Running as root ───────────────────────────────────────────────────

def test_k8s004_no_run_as_non_root_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""
    assert_triggers("K8S004", content)

def test_k8s004_run_as_non_root_passes():
    assert_passes("K8S004", _SAFE_DEPLOYMENT)

def test_k8s004_run_as_user_passes():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            runAsUser: 1000
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""
    assert_passes("K8S004", content)


# ── K8S005: allowPrivilegeEscalation ─────────────────────────────────────────

def test_k8s005_missing_ape_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""
    assert_triggers("K8S005", content)

def test_k8s005_explicit_false_passes():
    assert_passes("K8S005", _SAFE_DEPLOYMENT)


# ── K8S006: Latest image tag ──────────────────────────────────────────────────

def test_k8s006_latest_tag_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx:latest
"""
    assert_triggers("K8S006", content)

def test_k8s006_untagged_image_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx
"""
    assert_triggers("K8S006", content)

def test_k8s006_pinned_tag_passes():
    assert_passes("K8S006", _SAFE_DEPLOYMENT)

def test_k8s006_digest_pinned_passes():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: nginx@sha256:abc123def456
"""
    assert_passes("K8S006", content)


# ── K8S007: Missing readinessProbe ───────────────────────────────────────────

def test_k8s007_no_readiness_probe_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
"""
    assert_triggers("K8S007", content)

def test_k8s007_with_probe_passes():
    assert_passes("K8S007", _SAFE_DEPLOYMENT)


# ── K8S009: Writable root filesystem ─────────────────────────────────────────

def test_k8s009_no_readonly_root_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          resources:
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
"""
    assert_triggers("K8S009", content)

def test_k8s009_readonly_root_passes():
    assert_passes("K8S009", _SAFE_DEPLOYMENT)


# ── non-K8s YAML is ignored ───────────────────────────────────────────────────

def test_non_k8s_yaml_ignored():
    content = """\
name: my-chart
version: 1.0.0
description: A Helm chart
"""
    assert _scan_single(content, "Chart.yaml") == []

def test_docker_compose_ignored():
    content = """\
version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
"""
    assert _scan_single(content, "docker-compose.yaml") == []


# ── CronJob / Pod kinds are also scanned ─────────────────────────────────────

def test_pod_kind_scanned():
    content = """\
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: app
      image: nginx:latest
"""
    assert "K8S006" in rule_ids(content)

def test_finding_has_resource_field():
    findings = _scan_single(_SAFE_DEPLOYMENT.replace("privileged: false", "privileged: true"), "deploy.yaml")
    k8s001 = next((f for f in findings if f.rule_id == "K8S001"), None)
    assert k8s001 is not None
    assert k8s001.resource is not None
    assert "safe-app" in k8s001.resource


# ── K8S008: Missing securityContext ──────────────────────────────────────────

def test_k8s008_no_security_context_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
"""
    assert_triggers("K8S008", content)

def test_k8s008_with_security_context_passes():
    assert_passes("K8S008", _SAFE_DEPLOYMENT)


# ── K8S010: ALL capabilities ─────────────────────────────────────────────────

def test_k8s010_all_capabilities_triggers():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          securityContext:
            capabilities:
              add: ["ALL"]
"""
    assert_triggers("K8S010", content)

def test_k8s010_no_all_capability_passes():
    content = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
        - name: app
          image: myrepo/app:1.0.0
          securityContext:
            capabilities:
              drop: ["ALL"]
              add: ["NET_BIND_SERVICE"]
"""
    assert_passes("K8S010", content)
