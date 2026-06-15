"""
Terraform HCL static analysis rules.
Parses .tf files using python-hcl2 with regex fallback.

Rules implemented:
  TF001 - Wildcard IAM policy resource (*)
  TF002 - S3 bucket missing public access block
  TF003 - force_destroy on data resources
  TF004 - RDS skip_final_snapshot
  TF005 - RDS missing deletion_protection
  TF006 - Plaintext secrets in resource args
  TF007 - Security group allows all ingress (0.0.0.0/0)
  TF008 - KMS key scheduled deletion too short
  TF009 - Missing provider version constraints
  TF010 - EBS volume not encrypted
  TF011 - Lambda function missing reserved_concurrent_executions
  TF012 - IAM wildcard action
  TF013 - S3 bucket ACL public
  TF014 - RDS publicly_accessible
  TF015 - Secrets Manager missing rotation
"""

from __future__ import annotations

import re
from pathlib import Path

from driftguard_cli.scanner.engine import Category, ScanFinding, Severity

# ── Regex patterns (fallback when HCL2 fails) ─────────────────────────────────

_RE_RESOURCE = re.compile(r'^\s*resource\s+"([^"]+)"\s+"([^"]+)"', re.MULTILINE)
_RE_ATTR = re.compile(r"^\s*(\w[\w.]*)\s*=\s*(.+)$", re.MULTILINE)
_RE_BLOCK = re.compile(r"^\s*(\w+)\s*\{", re.MULTILINE)
_SECRET_ATTR = re.compile(r"(password|secret|token|private_key|api_key|access_key|secret_access_key)", re.IGNORECASE)
_WILDCARD_IAM = re.compile(r'(?:"Resource"\s*:\s*"\*"|resources\s*=\s*\[\s*"\*"\s*\])', re.IGNORECASE)
_ACTION_WILD = re.compile(r'(?:"Action"\s*:\s*"\*"|actions\s*=\s*\[\s*"\*"\s*\])', re.IGNORECASE)
_PUBLIC_ACL = re.compile(r'acl\s*=\s*"public', re.IGNORECASE)
_ALL_CIDR = re.compile(r'cidr_block[s]?\s*=\s*\[?\s*[^\]\n]*"0\.0\.0\.0/0"[^\]\n]*\]?', re.IGNORECASE)
_ALL_IPV6 = re.compile(r'ipv6_cidr_block[s]?\s*=\s*\[?\s*[^\]\n]*"::/0"[^\]\n]*\]?', re.IGNORECASE)
_PLAINTEXT = re.compile(r'^\s*(?:password|secret|token)\s*=\s*"(?!\$\{)[^"]{4,}"', re.IGNORECASE | re.MULTILINE)


def scan_tf_files(files: list[Path], root: Path) -> list[ScanFinding]:
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
    # ── TF001: Wildcard IAM resource ──────────────────────────────────────────
    for match in _WILDCARD_IAM.finditer(content):
        line = content[: match.start()].count("\n") + 1
        resource = _nearest_resource(content, match.start())
        findings.append(
            ScanFinding(
                rule_id="TF001",
                severity=Severity.CRITICAL,
                category=Category.IAM,
                title="IAM policy allows all resources (*)",
                message="Resource '*' in IAM policy grants access to ALL resources. Scope down to specific ARNs.",
                file=rel_path,
                line=line,
                resource=resource,
                suggestion='Replace "Resource": "*" with specific ARNs like "arn:aws:s3:::my-bucket/*"',
                docs_url="https://docs.driftguard.io/rules/TF001",
                controls=["access_control", "least_privilege"],
            )
        )

    # ── TF012: Wildcard IAM action ────────────────────────────────────────────
    for match in _ACTION_WILD.finditer(content):
        line = content[: match.start()].count("\n") + 1
        resource = _nearest_resource(content, match.start())
        findings.append(
            ScanFinding(
                rule_id="TF012",
                severity=Severity.HIGH,
                category=Category.IAM,
                title="IAM policy allows all actions (*)",
                message="Action '*' grants full API access. Use specific actions.",
                file=rel_path,
                line=line,
                resource=resource,
                suggestion='Replace "Action": "*" with specific actions like "s3:GetObject"',
                controls=["access_control", "least_privilege"],
            )
        )

    # ── TF006: Plaintext secrets ──────────────────────────────────────────────
    for match in _PLAINTEXT.finditer(content):
        line = content[: match.start()].count("\n") + 1
        attr = match.group(0).split("=")[0].strip()
        if "var." in match.group(0) or "${" in match.group(0):
            continue  # It's using a variable — not a hardcoded secret
        findings.append(
            ScanFinding(
                rule_id="TF006",
                severity=Severity.HIGH,
                category=Category.SECRETS,
                title=f"Potential hardcoded secret: {attr}",
                message=f"Attribute '{attr}' appears to contain a hardcoded secret value.",
                file=rel_path,
                line=line,
                suggestion="Use aws_secretsmanager_secret or variable with sensitive=true",
                controls=["secrets_management"],
            )
        )

    # ── TF007: Security group open to world ───────────────────────────────────
    if re.search(r'resource\s+"aws_security_group', content):
        for match in _ALL_CIDR.finditer(content):
            line = content[: match.start()].count("\n") + 1
            context_lines = content.split("\n")[max(0, line - 5) : line + 3]
            context_str = "\n".join(context_lines)
            if "ingress" in context_str.lower():
                resource = _nearest_resource(content, match.start())
                findings.append(
                    ScanFinding(
                        rule_id="TF007",
                        severity=Severity.HIGH,
                        category=Category.NETWORK,
                        title="Security group open to all IPv4",
                        message="Ingress rule allows all traffic from 0.0.0.0/0. Restrict to specific CIDR blocks.",
                        file=rel_path,
                        line=line,
                        resource=resource,
                        suggestion="Replace 0.0.0.0/0 with specific CIDR ranges",
                        controls=["network_exposure", "public_exposure"],
                    )
                )

    # ── TF013: S3 public ACL ──────────────────────────────────────────────────
    for match in _PUBLIC_ACL.finditer(content):
        line = content[: match.start()].count("\n") + 1
        resource = _nearest_resource(content, match.start())
        findings.append(
            ScanFinding(
                rule_id="TF013",
                severity=Severity.CRITICAL,
                category=Category.STORAGE,
                title="S3 bucket has public ACL",
                message="S3 bucket ACL is set to public-read or public-read-write. This exposes all objects.",
                file=rel_path,
                line=line,
                resource=resource,
                suggestion='Remove the acl attribute or set acl = "private"',
                controls=["public_exposure", "data_protection"],
            )
        )

    # ── TF002: S3 bucket missing public access block ──────────────────────────
    # Fire once per file if an aws_s3_bucket exists but no public access block resource
    if re.search(r'resource\s+"aws_s3_bucket"', content) and not re.search(
        r'resource\s+"aws_s3_bucket_public_access_block"', content
    ):
        for m in re.finditer(r'resource\s+"aws_s3_bucket"\s+"([^"]+)"', content):
            start = content[: m.start()].count("\n") + 1
            findings.append(
                ScanFinding(
                    rule_id="TF002",
                    severity=Severity.HIGH,
                    category=Category.STORAGE,
                    title="S3 bucket missing public access block",
                    message=(
                        f"aws_s3_bucket.{m.group(1)} has no aws_s3_bucket_public_access_block. "
                        "Objects may be publicly accessible."
                    ),
                    file=rel_path,
                    line=start,
                    resource=f"aws_s3_bucket.{m.group(1)}",
                    suggestion=(
                        "Add aws_s3_bucket_public_access_block with block_public_acls = block_public_policy = true"
                    ),
                    controls=["public_exposure", "data_protection"],
                )
            )

    # ── TF009: Missing provider version constraints ───────────────────────────
    if re.search(r'\bprovider\s+"', content) and not re.search(r"\brequired_providers\s*\{", content):
        findings.append(
            ScanFinding(
                rule_id="TF009",
                severity=Severity.LOW,
                category=Category.BEST_PRACTICE,
                title="Missing provider version constraints",
                message="No required_providers block found. Provider versions are unpinned and may break on updates.",
                file=rel_path,
                line=1,
                suggestion=(
                    'Add terraform { required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } } }'
                ),
                controls=["change_management"],
            )
        )

    # ── Per-resource structured rules (requires parsed blocks) ────────────────
    resource_blocks = _extract_resource_blocks(content)

    for res_type, res_name, body, start_line in resource_blocks:
        # TF003: force_destroy on storage
        if "force_destroy" in body and res_type in (
            "aws_s3_bucket",
            "google_storage_bucket",
            "aws_dynamodb_table",
        ):
            val = _attr_value(body, "force_destroy")
            if val in ("true", "True", "1"):
                findings.append(
                    ScanFinding(
                        rule_id="TF003",
                        severity=Severity.HIGH,
                        category=Category.STORAGE,
                        title=f"force_destroy enabled on {res_type}",
                        message=f"{res_type}.{res_name} has force_destroy=true. This allows destroying non-empty storage.",  # noqa: E501
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Set force_destroy = false or protect with lifecycle prevent_destroy",
                        controls=["data_protection"],
                    )
                )

        # TF004: RDS skip_final_snapshot
        if res_type in ("aws_db_instance", "aws_rds_cluster", "aws_rds_cluster_instance"):
            val = _attr_value(body, "skip_final_snapshot")
            if val in ("true", "True"):
                findings.append(
                    ScanFinding(
                        rule_id="TF004",
                        severity=Severity.HIGH,
                        category=Category.STORAGE,
                        title="RDS skip_final_snapshot enabled",
                        message=f"{res_type}.{res_name}: No final snapshot will be taken before deletion.",
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Set skip_final_snapshot = false and set final_snapshot_identifier",
                        controls=["backup_retention", "data_protection"],
                    )
                )

        # TF005: RDS missing deletion_protection
        if res_type in ("aws_db_instance", "aws_rds_cluster"):
            val = _attr_value(body, "deletion_protection")
            if val not in ("true", "True"):
                findings.append(
                    ScanFinding(
                        rule_id="TF005",
                        severity=Severity.MEDIUM,
                        category=Category.STORAGE,
                        title="RDS missing deletion protection",
                        message=f"{res_type}.{res_name} does not have deletion_protection = true.",
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Add deletion_protection = true",
                        controls=["data_protection"],
                    )
                )

        # TF014: RDS publicly accessible
        if res_type in ("aws_db_instance", "aws_rds_instance"):
            val = _attr_value(body, "publicly_accessible")
            if val in ("true", "True"):
                findings.append(
                    ScanFinding(
                        rule_id="TF014",
                        severity=Severity.CRITICAL,
                        category=Category.NETWORK,
                        title="RDS instance is publicly accessible",
                        message=f"{res_type}.{res_name} is exposed to the internet.",
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Set publicly_accessible = false and use private subnets",
                        controls=["public_exposure", "network_exposure"],
                    )
                )

        # TF010: EBS unencrypted
        if res_type in ("aws_ebs_volume", "aws_instance"):
            val = _attr_value(body, "encrypted")
            if val not in ("true", "True") and "kms_key_id" not in body:
                findings.append(
                    ScanFinding(
                        rule_id="TF010",
                        severity=Severity.MEDIUM,
                        category=Category.ENCRYPTION,
                        title="EBS volume not encrypted at rest",
                        message=f"{res_type}.{res_name}: No encryption configured.",
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Add encrypted = true and kms_key_id for compliance",
                        controls=["encryption_at_rest"],
                    )
                )

        # TF008: KMS key deletion window too short
        if res_type == "aws_kms_key":
            val = _attr_value(body, "deletion_window_in_days")
            if val is not None:
                try:
                    if int(val) < 7:
                        findings.append(
                            ScanFinding(
                                rule_id="TF008",
                                severity=Severity.MEDIUM,
                                category=Category.ENCRYPTION,
                                title="KMS key deletion window is too short",
                                message=(
                                    f"{res_type}.{res_name}: deletion_window_in_days={val}. Minimum recommended is 7."
                                ),
                                file=rel_path,
                                line=start_line,
                                resource=f"{res_type}.{res_name}",
                                suggestion="Set deletion_window_in_days to at least 7 (max 30) to allow recovery",
                                controls=["data_protection", "encryption_at_rest"],
                            )
                        )
                except ValueError:
                    pass

        # TF011: Lambda missing reserved_concurrent_executions
        if res_type == "aws_lambda_function":
            if _attr_value(body, "reserved_concurrent_executions") is None:
                findings.append(
                    ScanFinding(
                        rule_id="TF011",
                        severity=Severity.LOW,
                        category=Category.COMPUTE,
                        title="Lambda missing reserved_concurrent_executions",
                        message=(
                            f"{res_type}.{res_name}: No concurrency limit set. "
                            "An event storm can exhaust the regional Lambda concurrency pool."
                        ),
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Set reserved_concurrent_executions to an appropriate limit (or 0 to disable)",
                        controls=["resource_management"],
                    )
                )

        # TF015: Secrets Manager secret missing rotation
        if res_type == "aws_secretsmanager_secret":
            has_rotation = "rotation_lambda_arn" in body or re.search(
                r'resource\s+"aws_secretsmanager_secret_rotation"', content
            )
            if not has_rotation:
                findings.append(
                    ScanFinding(
                        rule_id="TF015",
                        severity=Severity.MEDIUM,
                        category=Category.SECRETS,
                        title="Secrets Manager secret missing rotation",
                        message=(
                            f"{res_type}.{res_name}: No rotation configured. Long-lived secrets increase breach impact."
                        ),
                        file=rel_path,
                        line=start_line,
                        resource=f"{res_type}.{res_name}",
                        suggestion="Add aws_secretsmanager_secret_rotation or set rotation_lambda_arn",
                        controls=["secrets_management", "access_control"],
                    )
                )

    return findings


def _nearest_resource(content: str, pos: int) -> str | None:
    """Find the nearest resource block before position."""
    before = content[:pos]
    matches = list(_RE_RESOURCE.finditer(before))
    if matches:
        m = matches[-1]
        return f"{m.group(1)}.{m.group(2)}"
    return None


def _extract_resource_blocks(content: str) -> list[tuple[str, str, str, int]]:
    """Extract (resource_type, resource_name, body, start_line) tuples."""
    results = []
    pattern = re.compile(r'resource\s+"([^"]+)"\s+"([^"]+)"\s*\{', re.MULTILINE)
    for match in pattern.finditer(content):
        start = match.end()
        res_type = match.group(1)
        res_name = match.group(2)
        start_line = content[: match.start()].count("\n") + 1
        # Brace counting to extract body; ignore braces inside double-quoted strings
        depth = 1
        i = start
        in_quote = False
        while i < len(content) and depth > 0:
            char = content[i]
            if char == '"' and (i == 0 or content[i - 1] != "\\"):
                in_quote = not in_quote
            elif not in_quote:
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
            i += 1
        body = content[start : i - 1]
        results.append((res_type, res_name, body, start_line))
    return results


def _attr_value(body: str, attr: str) -> str | None:
    """Extract the value of a simple attribute from a block body."""
    pattern = re.compile(rf"^\s*{attr}\s*=\s*(.+)$", re.MULTILINE)
    m = pattern.search(body)
    if m:
        return m.group(1).strip().strip('"').strip("'")
    return None


def _try_hcl2(content: str) -> dict | None:
    """Try to parse HCL2 content. Returns None on failure."""
    try:
        import io

        import hcl2

        return hcl2.load(io.StringIO(content))
    except Exception:
        return None
