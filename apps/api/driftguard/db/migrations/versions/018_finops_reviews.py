"""add finops_reviews and finops_resource_costs tables

Revision ID: 018
Revises: 016
Create Date: 2026-06-17
"""
import sqlalchemy as sa
from alembic import op

revision = "018"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "finops_reviews",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("analysis_id", sa.String(36), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("repo_full_name", sa.String(255), nullable=False),
        sa.Column("pr_number", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_monthly_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_monthly_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delta_monthly_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delta_annual_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delta_pct", sa.Float(), nullable=False, server_default="0"),
        sa.Column("terraform_files", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("resource_costs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("recommendations", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("risk_reasons", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_finops_reviews_analysis_id", "finops_reviews", ["analysis_id"])
    op.create_index("ix_finops_reviews_installation_id", "finops_reviews", ["installation_id"])

    op.create_table(
        "finops_resource_costs",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("finops_review_id", sa.String(36), nullable=False),
        sa.Column("resource_label", sa.String(255), nullable=False),
        sa.Column("resource_type", sa.String(128), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("change_type", sa.String(20), nullable=False, server_default="create"),
        sa.Column("monthly_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("file_path", sa.String(512), nullable=True),
        sa.ForeignKeyConstraint(["finops_review_id"], ["finops_reviews.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_finops_resource_costs_review_id", "finops_resource_costs", ["finops_review_id"])


def downgrade() -> None:
    op.drop_index("ix_finops_resource_costs_review_id", table_name="finops_resource_costs")
    op.drop_table("finops_resource_costs")
    op.drop_index("ix_finops_reviews_installation_id", table_name="finops_reviews")
    op.drop_index("ix_finops_reviews_analysis_id", table_name="finops_reviews")
    op.drop_table("finops_reviews")
