"""quota enforcement: subscription_status, monthly_usage, scan_runs

Revision ID: 010
Revises: 009
Create Date: 2026-06-08

"""

import sqlalchemy as sa
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add subscription_status to organizations.
    op.add_column(
        "organizations",
        sa.Column("subscription_status", sa.String(32), nullable=False, server_default="free"),
    )

    # Monthly PR usage counters (one row per org per YYYY-MM).
    op.create_table(
        "monthly_usage",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),  # YYYY-MM UTC
        sa.Column("pr_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("org_id", "month", name="uq_monthly_usage_org_month"),
    )
    op.create_index("ix_monthly_usage_org", "monthly_usage", ["org_id"])

    # Idempotency log — one row per unique (org, repo, pr, sha).
    op.create_table(
        "scan_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_id", sa.String(36), nullable=False),
        sa.Column("pr_number", sa.Integer(), nullable=False),
        sa.Column("head_sha", sa.String(40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("org_id", "repo_id", "pr_number", "head_sha", name="uq_scan_run"),
    )
    op.create_index("ix_scan_runs_org", "scan_runs", ["org_id"])


def downgrade() -> None:
    op.drop_table("scan_runs")
    op.drop_table("monthly_usage")
    op.drop_column("organizations", "subscription_status")
