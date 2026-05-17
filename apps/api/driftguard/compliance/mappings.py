"""Checkov rule IDs mapped to compliance control categories.

Source: Checkov docs (https://www.checkov.io/5.Policy%20Index/terraform.html).
Coverage focuses on the highest-frequency rules first; extend over time.
"""

CHECKOV_RULE_TO_CONTROLS: dict[str, tuple[str, ...]] = {
    # encryption at rest
    "CKV_AWS_3": ("encryption_at_rest",),  # EBS encryption
    "CKV_AWS_19": ("encryption_at_rest",),  # S3 encryption
    "CKV_AWS_17": ("encryption_at_rest",),  # RDS encryption
    "CKV_AWS_16": ("encryption_at_rest",),  # RDS storage encrypted
    "CKV_AWS_166": ("encryption_at_rest",),  # Backup vault encryption
    "CKV_AWS_158": ("encryption_at_rest",),  # CloudWatch log group KMS
    "CKV_AZURE_3": ("encryption_at_rest",),  # Storage account encryption
    "CKV_AZURE_33": ("encryption_at_rest",),
    "CKV_GCP_6": ("encryption_at_rest",),
    "CKV_GCP_29": ("encryption_at_rest",),
    # encryption in transit
    "CKV_AWS_2": ("encryption_in_transit",),  # ALB HTTPS
    "CKV_AWS_103": ("encryption_in_transit",),  # ELB TLS 1.2+
    "CKV_AWS_20": ("encryption_in_transit",),  # S3 secure transport
    "CKV_AWS_91": ("encryption_in_transit",),
    "CKV_AZURE_1": ("encryption_in_transit",),  # Storage HTTPS only
    "CKV_GCP_27": ("encryption_in_transit",),
    # public exposure
    "CKV_AWS_24": ("public_exposure",),  # Security group SSH open
    "CKV_AWS_25": ("public_exposure",),  # Security group RDP open
    "CKV_AWS_260": ("public_exposure",),
    "CKV_AWS_53": ("public_exposure",),  # S3 block public ACLs
    "CKV_AWS_54": ("public_exposure",),  # S3 block public policy
    "CKV_AWS_55": ("public_exposure",),  # S3 ignore public ACLs
    "CKV_AWS_56": ("public_exposure",),  # S3 restrict public buckets
    "CKV_AWS_57": ("public_exposure",),  # S3 not public read
    "CKV_AWS_58": ("public_exposure",),
    "CKV_AZURE_8": ("public_exposure",),
    "CKV_AZURE_9": ("public_exposure",),
    "CKV_GCP_7": ("public_exposure",),
    "CKV_GCP_2": ("public_exposure",),  # SSH from anywhere
    # logging / audit
    "CKV_AWS_18": ("logging_audit",),  # S3 access logging
    "CKV_AWS_67": ("logging_audit",),  # CloudTrail log validation
    "CKV_AWS_36": ("logging_audit",),  # CloudTrail multi-region
    "CKV_AWS_35": ("logging_audit",),  # CloudTrail encryption
    "CKV_AWS_50": ("logging_audit",),  # Lambda x-ray tracing
    "CKV_AZURE_37": ("logging_audit",),
    "CKV_GCP_82": ("logging_audit",),
    # access control / IAM
    "CKV_AWS_41": ("access_control",),  # No hard-coded credentials
    "CKV_AWS_43": ("access_control",),
    "CKV_AWS_109": ("access_control",),  # IAM no wildcard actions
    "CKV_AWS_110": ("access_control",),  # IAM no wildcard resources
    "CKV_AWS_111": ("access_control",),
    "CKV_AWS_273": ("access_control",),
    "CKV_AWS_355": ("access_control",),
    "CKV_AZURE_22": ("access_control",),
    "CKV_GCP_45": ("access_control",),
    "CKV_GCP_49": ("access_control",),
    # backup / retention
    "CKV_AWS_21": ("backup_retention",),  # S3 versioning
    "CKV_AWS_28": ("backup_retention",),  # DynamoDB PITR
    "CKV_AWS_133": ("backup_retention",),  # RDS backup retention
    "CKV_AWS_338": ("backup_retention",),
    # vulnerability management
    "CKV_AWS_79": ("vulnerability_management",),  # EC2 IMDSv2
    "CKV_AWS_135": ("vulnerability_management",),
    "CKV_AWS_8": ("vulnerability_management",),  # EBS launch config encryption
}


def controls_for_rule(rule_id: str | None) -> tuple[str, ...]:
    if not rule_id:
        return ()
    return CHECKOV_RULE_TO_CONTROLS.get(rule_id, ())
