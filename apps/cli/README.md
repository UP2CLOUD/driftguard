# DriftGuard CLI

**Static IaC security scanner for Terraform, Kubernetes, and GitHub Actions.**

DriftGuard CLI (`dg`) scans your infrastructure-as-code for misconfigurations, security anti-patterns, and policy violations — with no external API calls, no LLM, and no cloud credentials required.

## Features

- **33 built-in rules** across Terraform (TF001–TF015), Kubernetes (K8S001–K8S010), and GitHub Actions (GHA001–GHA008)
- **Terraform plan analysis** — deterministic 0–100 risk score for plan JSON files
- **Multiple output formats** — table (default), JSON, SARIF (GitHub Code Scanning compatible)
- **CI/CD gates** — `--fail-on` flag for pipeline integration
- **Zero cloud credentials** — runs fully offline

---

## Installation

```bash
pip install driftguard-cli
```

Or with [pipx](https://pypa.github.io/pipx/) (recommended for CLI tools):

```bash
pipx install driftguard-cli
```

### From source

```bash
git clone https://github.com/up2cloud/driftguard
cd driftguard/apps/cli
pip install -e .
```

---

## Quick Start

```bash
# Scan the current directory
dg scan .

# Scan an infra directory with verbose output
dg scan ./infra -v

# CI gate: exit 1 if any high/critical findings
dg check ./infra

# Analyse a Terraform plan
terraform plan -out=plan.out
terraform show -json plan.out > plan.json
dg analyze plan.json

# List all rules
dg rules
```

---

## Commands

### `dg scan [PATH]`

Recursively scans a directory for Terraform (`.tf`), Kubernetes YAML, and GitHub Actions workflow files.

```
Usage: dg scan [OPTIONS] [PATH]

Options:
  -o, --output [table|json|sarif]  Output format (default: table)
  -v, --verbose                    Show fix suggestions and file locations
  -s, --min-severity TEXT          Minimum severity to report (info/low/medium/high/critical)
  --fail-on TEXT                   Exit 1 if findings at or above this severity exist
```

**Examples:**

```bash
dg scan .
dg scan ./infra -v
dg scan ./infra -o json > findings.json
dg scan ./infra -o sarif > results.sarif
dg scan ./infra --fail-on high
dg scan ./infra --min-severity medium
```

**Exit codes:**
- `0` — Scan complete, no blocking findings (or `--fail-on` threshold not reached)
- `1` — Blocking findings found (when `--fail-on` is set)
- `2` — Invalid arguments or path does not exist

---

### `dg check [PATH]`

Like `dg scan` but always exits non-zero when findings meet the threshold. Designed for CI pipelines.

```
Usage: dg check [OPTIONS] [PATH]

Options:
  --severity TEXT                  Severity threshold that causes exit 1 (default: high)
  -o, --output [table|json|sarif]  Output format
```

**Examples:**

```bash
dg check .
dg check ./infra --severity critical
dg check ./infra -o json
```

---

### `dg analyze PLAN_FILE`

Analyses a Terraform plan JSON file and produces a deterministic risk score (0–100).

```
Usage: dg analyze [OPTIONS] PLAN_FILE

Options:
  -o, --output [table|json]  Output format
  -v, --verbose              Show risk factors
  --fail-on TEXT             Exit 1 if risk level meets threshold (low/medium/high/critical)
```

**Generating a plan JSON:**

```bash
terraform plan -out=plan.out
terraform show -json plan.out > plan.json
dg analyze plan.json
dg analyze plan.json -v
dg analyze plan.json --fail-on high
```

**Risk levels:**
| Score | Level | Description |
|-------|-------|-------------|
| 0–29  | low | Safe to merge |
| 30–59 | medium | Review recommended |
| 60–79 | high | Human approval required |
| 80–100 | critical | Blocked by default |

---

### `dg rules`

List all built-in rules.

```bash
dg rules
dg rules --category terraform
dg rules --category kubernetes
dg rules --category github_actions
dg rules -o json
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/driftguard.yml
name: DriftGuard Security Scan

on:
  pull_request:
    paths:
      - "**.tf"
      - "**.yaml"
      - "**.yml"

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write   # for SARIF upload
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Install DriftGuard CLI
        run: pip install driftguard-cli

      - name: Run DriftGuard Scan
        run: dg scan . -o sarif > results.sarif

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: results.sarif

      - name: Fail on high/critical findings
        run: dg check . --severity high
```

### GitLab CI

```yaml
# .gitlab-ci.yml
driftguard:
  stage: test
  image: python:3.12-slim
  script:
    - pip install driftguard-cli
    - dg scan . -o json > driftguard-report.json
    - dg check . --severity high
  artifacts:
    reports:
      sast: driftguard-report.json
    when: always
```

### CircleCI

```yaml
# .circleci/config.yml
jobs:
  security-scan:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - run:
          name: Install DriftGuard
          command: pip install driftguard-cli
      - run:
          name: Scan IaC
          command: dg check ./infra --severity high
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: driftguard
        name: DriftGuard IaC Security Scan
        entry: dg check
        language: python
        additional_dependencies: [driftguard-cli]
        types_or: [terraform, yaml]
        pass_filenames: false
```

### Terraform Plan Analysis in CI

```yaml
# GitHub Actions — plan risk gate
- name: Terraform Plan
  run: |
    terraform plan -out=plan.out
    terraform show -json plan.out > plan.json

- name: Analyse Plan Risk
  run: dg analyze plan.json --fail-on high -v
```

---

## Rules Reference

### Terraform Rules

| Rule | Severity | Description |
|------|----------|-------------|
| TF001 | critical | IAM policy allows all resources (`"Resource": "*"`) |
| TF002 | high | S3 bucket missing `aws_s3_bucket_public_access_block` |
| TF003 | high | `force_destroy = true` on storage resource |
| TF004 | high | RDS `skip_final_snapshot = true` |
| TF005 | medium | RDS missing `deletion_protection = true` |
| TF006 | high | Potential hardcoded secret (password/token/key attributes) |
| TF007 | high | Security group allows all ingress from `0.0.0.0/0` |
| TF008 | medium | KMS key deletion window < 7 days |
| TF009 | low | No `required_providers` block (unpinned provider versions) |
| TF010 | medium | EBS volume not encrypted at rest |
| TF011 | low | Lambda function missing `reserved_concurrent_executions` |
| TF012 | high | IAM policy allows all actions (`"Action": "*"`) |
| TF013 | critical | S3 bucket has public ACL (`public-read` / `public-read-write`) |
| TF014 | critical | RDS instance set to `publicly_accessible = true` |
| TF015 | medium | Secrets Manager secret has no rotation configured |

### Kubernetes Rules

| Rule | Severity | Description |
|------|----------|-------------|
| K8S001 | critical | `privileged: true` container |
| K8S002 | medium | Missing `resources.limits.cpu` or `resources.limits.memory` |
| K8S003 | critical | `hostPID: true` or `hostNetwork: true` |
| K8S004 | medium | `runAsNonRoot` not set — container may run as UID 0 |
| K8S005 | high | `allowPrivilegeEscalation` not explicitly set to `false` |
| K8S006 | medium | Image using `:latest` tag or no tag/digest |
| K8S007 | low | Missing `readinessProbe` |
| K8S008 | medium | Container has no `securityContext` |
| K8S009 | low | `readOnlyRootFilesystem` not set |
| K8S010 | critical | `capabilities.add` includes `ALL` |

### GitHub Actions Rules

| Rule | Severity | Description |
|------|----------|-------------|
| GHA001 | high | Action pinned to mutable ref (`@main`, `@master`, `@v1`) instead of SHA |
| GHA002 | critical | `ACTIONS_ALLOW_UNSECURE_COMMANDS: true` — deprecated command injection vector |
| GHA003 | critical | Direct `${{ github.event.* }}` interpolation in `run:` — shell injection |
| GHA004 | medium | No `permissions:` block — defaults to write-all |
| GHA005 | critical | `pull_request_target` with PR head checkout — runs untrusted code with repo secrets |
| GHA006 | high | `${{ secrets.* }}` directly in `run:` step — may leak via logs |
| GHA007 | high | `curl ... | bash` — remote script execution without checksum verification |
| GHA008 | medium | `github.event.*` user-controlled data in `if:` condition |

---

## Output Formats

### Table (default)

Human-readable Rich table output. Use for local development.

### JSON

Machine-readable JSON. Use for CI reporting, custom dashboards, or chaining with `jq`.

```bash
dg scan . -o json | jq '.findings[] | select(.severity == "critical")'
dg scan . -o json | jq '.summary'
```

### SARIF

[SARIF v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-schema-2.1.0.json) for GitHub Code Scanning and other SARIF-compatible tools.

```bash
dg scan . -o sarif > results.sarif
```

Upload to GitHub Code Scanning with `github/codeql-action/upload-sarif@v3` (see CI examples above).

---

## Configuration

DriftGuard CLI works out of the box with no configuration. Future releases will support a `.driftguard.yml` config file for:

- Custom severity overrides per rule
- Rule allowlists/denylists
- Custom CIDR ranges for network rules
- Integration with DriftGuard Cloud for org-wide policy

---

## Contributing

Contributions are welcome! To add a new rule:

1. Identify the rule file: `driftguard_cli/scanner/rules/terraform.py`, `kubernetes.py`, or `github_actions.py`
2. Add a regex or YAML-parsed check following the existing patterns
3. Add the rule to `_get_all_rules()` in `main.py`
4. Add tests in `tests/test_scanner.py`
5. Open a PR — the CI will run the full test suite

**Local development:**

```bash
git clone https://github.com/up2cloud/driftguard
cd driftguard/apps/cli
pip install -e ".[dev]"
dg scan .            # test against this repo
pytest tests/        # run tests
```

---

## License

Apache 2.0 — see [LICENSE](../../LICENSE).

---

## DriftGuard Cloud

The CLI is the open-source core of [DriftGuard](https://driftguard.io) — a platform that adds:

- GitHub App integration with inline PR comments
- AI-powered remediation suggestions
- Drift detection between Terraform state and live cloud resources
- Team-wide policy enforcement and compliance reporting
- Historical trend analysis

[Sign up for free →](https://driftguard.io)
