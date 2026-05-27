"""Tests for Terraform static analysis rules (TF001–TF015)."""
import pytest
from driftguard.services.scanner.rules.terraform import _scan_single


# ── helpers ──────────────────────────────────────────────────────────────────

def rule_ids(content: str) -> set[str]:
    return {f.rule_id for f in _scan_single(content, "main.tf")}


def assert_triggers(rule: str, content: str):
    assert rule in rule_ids(content), f"{rule} should fire on:\n{content}"


def assert_passes(rule: str, content: str):
    assert rule not in rule_ids(content), f"{rule} should NOT fire on:\n{content}"


# ── TF001: Wildcard IAM resource ──────────────────────────────────────────────

_TF001_BAD = '''
resource "aws_iam_policy" "admin" {
  policy = <<EOF
{"Statement": [{"Resource": "*", "Action": "s3:GetObject"}]}
EOF
}
'''
_TF001_GOOD = '''
resource "aws_iam_policy" "scoped" {
  policy = <<EOF
{"Statement": [{"Resource": "arn:aws:s3:::my-bucket/*"}]}
EOF
}
'''

def test_tf001_wildcard_resource_triggers():
    assert_triggers("TF001", _TF001_BAD)

def test_tf001_specific_arn_passes():
    assert_passes("TF001", _TF001_GOOD)


# ── TF012: Wildcard IAM action ────────────────────────────────────────────────

def test_tf012_wildcard_action_triggers():
    content = '''
resource "aws_iam_policy" "full" {
  policy = <<EOF
{"Statement": [{"Action": "*", "Resource": "arn:aws:s3:::bucket"}]}
EOF
}
'''
    assert_triggers("TF012", content)

def test_tf012_specific_action_passes():
    content = '''
resource "aws_iam_policy" "scoped" {
  policy = <<EOF
{"Statement": [{"Action": "s3:GetObject", "Resource": "*"}]}
EOF
}
'''
    assert_passes("TF012", content)


# ── TF006: Plaintext secrets ──────────────────────────────────────────────────

def test_tf006_hardcoded_password_triggers():
    content = '''
resource "aws_db_instance" "db" {
  password = "SuperSecret123"
}
'''
    assert_triggers("TF006", content)

def test_tf006_variable_reference_passes():
    content = '''
resource "aws_db_instance" "db" {
  password = var.db_password
}
'''
    assert_passes("TF006", content)

def test_tf006_interpolated_variable_passes():
    content = '''
resource "aws_db_instance" "db" {
  password = "${var.db_password}"
}
'''
    assert_passes("TF006", content)


# ── TF007: Security group open to world ───────────────────────────────────────

def test_tf007_open_ingress_triggers():
    content = '''
resource "aws_security_group" "web" {
  ingress {
    cidr_blocks = "0.0.0.0/0"
    from_port   = 22
    to_port     = 22
  }
}
'''
    assert_triggers("TF007", content)

def test_tf007_restricted_cidr_passes():
    content = '''
resource "aws_security_group" "web" {
  ingress {
    cidr_blocks = "10.0.0.0/8"
    from_port   = 22
    to_port     = 22
  }
}
'''
    assert_passes("TF007", content)

def test_tf007_open_egress_does_not_trigger():
    # Only ingress should trigger TF007
    content = '''
resource "aws_security_group" "web" {
  egress {
    cidr_blocks = "0.0.0.0/0"
  }
}
'''
    assert_passes("TF007", content)


# ── TF013: S3 public ACL ──────────────────────────────────────────────────────

def test_tf013_public_read_triggers():
    content = '''
resource "aws_s3_bucket" "public" {
  acl = "public-read"
}
'''
    assert_triggers("TF013", content)

def test_tf013_private_acl_passes():
    content = '''
resource "aws_s3_bucket" "private" {
  acl = "private"
}
'''
    assert_passes("TF013", content)


# ── TF003: force_destroy ──────────────────────────────────────────────────────

def test_tf003_force_destroy_s3_triggers():
    content = '''
resource "aws_s3_bucket" "logs" {
  force_destroy = true
}
'''
    assert_triggers("TF003", content)

def test_tf003_force_destroy_false_passes():
    content = '''
resource "aws_s3_bucket" "logs" {
  force_destroy = false
}
'''
    assert_passes("TF003", content)

def test_tf003_non_storage_resource_not_affected():
    content = '''
resource "aws_instance" "web" {
  force_destroy = true
}
'''
    assert_passes("TF003", content)


# ── TF004: RDS skip_final_snapshot ───────────────────────────────────────────

def test_tf004_skip_snapshot_triggers():
    content = '''
resource "aws_db_instance" "main" {
  skip_final_snapshot = true
  deletion_protection  = true
}
'''
    assert_triggers("TF004", content)

def test_tf004_keep_snapshot_passes():
    content = '''
resource "aws_db_instance" "main" {
  skip_final_snapshot     = false
  final_snapshot_identifier = "main-final"
  deletion_protection     = true
}
'''
    assert_passes("TF004", content)


# ── TF005: RDS missing deletion_protection ────────────────────────────────────

def test_tf005_missing_deletion_protection_triggers():
    content = '''
resource "aws_db_instance" "main" {
  skip_final_snapshot = false
}
'''
    assert_triggers("TF005", content)

def test_tf005_deletion_protection_enabled_passes():
    content = '''
resource "aws_db_instance" "main" {
  skip_final_snapshot  = false
  deletion_protection  = true
}
'''
    assert_passes("TF005", content)


# ── TF014: RDS publicly accessible ───────────────────────────────────────────

def test_tf014_publicly_accessible_triggers():
    content = '''
resource "aws_db_instance" "public" {
  publicly_accessible = true
  deletion_protection = true
}
'''
    assert_triggers("TF014", content)

def test_tf014_private_rds_passes():
    content = '''
resource "aws_db_instance" "private" {
  publicly_accessible = false
  deletion_protection = true
}
'''
    assert_passes("TF014", content)


# ── TF010: EBS unencrypted ────────────────────────────────────────────────────

def test_tf010_unencrypted_ebs_triggers():
    content = '''
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
}
'''
    assert_triggers("TF010", content)

def test_tf010_encrypted_ebs_passes():
    content = '''
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  encrypted         = true
  kms_key_id        = aws_kms_key.ebs.arn
}
'''
    assert_passes("TF010", content)


# ── finding metadata ─────────────────────────────────────────────────────────

def test_finding_has_required_fields():
    findings = _scan_single(_TF001_BAD, "infra/main.tf")
    tf001 = next(f for f in findings if f.rule_id == "TF001")
    assert tf001.severity is not None
    assert tf001.category is not None
    assert tf001.message
    assert tf001.file == "infra/main.tf"
    assert tf001.line is not None and tf001.line >= 1

def test_empty_file_no_findings():
    assert _scan_single("", "empty.tf") == []

def test_unrelated_hcl_no_findings():
    content = '''
variable "region" {
  default = "us-east-1"
}
output "name" {
  value = "hello"
}
'''
    assert _scan_single(content, "vars.tf") == []
