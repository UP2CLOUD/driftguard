# Customer deploys this in their AWS account to grant Driftguard read access.
# Pass driftguard_aws_account_id from your Driftguard settings page.

variable "driftguard_aws_account_id" {
  description = "Driftguard AWS account ID (shown in your settings page)"
  type        = string
}

variable "role_name" {
  description = "Name of the IAM role to create"
  type        = string
  default     = "driftguard-readonly"
}

variable "state_bucket" {
  description = "S3 bucket containing your terraform state (optional)"
  type        = string
  default     = ""
}

data "aws_iam_policy_document" "trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.driftguard_aws_account_id}:root"]
    }
    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = [var.role_name]
    }
  }
}

data "aws_iam_policy_document" "permissions" {
  statement {
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }

  # Read-only access for plan + drift detection
  statement {
    effect = "Allow"
    actions = [
      "ec2:Describe*",
      "s3:GetObject",
      "s3:ListBucket",
      "rds:Describe*",
      "iam:GetRole",
      "iam:ListRolePolicies",
      "ecs:Describe*",
      "eks:Describe*",
      "lambda:GetFunction",
      "lambda:ListFunctions",
      "cloudwatch:GetMetricData",
    ]
    resources = ["*"]
  }

  dynamic "statement" {
    for_each = var.state_bucket != "" ? [1] : []
    content {
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:ListBucket",
      ]
      resources = [
        "arn:aws:s3:::${var.state_bucket}",
        "arn:aws:s3:::${var.state_bucket}/*",
      ]
    }
  }
}

resource "aws_iam_role" "driftguard" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.trust.json

  tags = {
    ManagedBy = "driftguard"
  }
}

resource "aws_iam_role_policy" "driftguard" {
  name   = "${var.role_name}-policy"
  role   = aws_iam_role.driftguard.id
  policy = data.aws_iam_policy_document.permissions.json
}

output "role_arn" {
  description = "Paste this into Driftguard repo settings → AWS Role ARN"
  value       = aws_iam_role.driftguard.arn
}
