"""init schema

Revision ID: 001
Revises:
Create Date: 2025-05-17 22:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("github_installation_id", sa.Integer(), unique=True, nullable=False),
        sa.Column("plan", sa.String(20), default="free"),
        sa.Column("stripe_customer_id", sa.String(255)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_organizations_installation", "organizations", ["github_installation_id"])

    op.create_table(
        "repositories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("github_repo_id", sa.Integer(), unique=True, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("default_branch", sa.String(255), default="main"),
        sa.Column("enabled", sa.Boolean(), default=True),
        sa.Column("settings", sa.JSON(), default={}),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_repositories_org", "repositories", ["org_id"])
    op.create_index("ix_repositories_repo_id", "repositories", ["github_repo_id"])

    op.create_table(
        "pull_requests",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repositories.id"), nullable=False),
        sa.Column("github_pr_number", sa.Integer(), nullable=False),
        sa.Column("head_sha", sa.String(40), nullable=False),
        sa.Column("base_sha", sa.String(40)),
        sa.Column("status", sa.String(20), default="pending"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_prs_repo", "pull_requests", ["repo_id"])
    op.create_index("ix_prs_number", "pull_requests", ["repo_id", "github_pr_number"])

    op.create_table(
        "analyses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("pr_id", sa.String(36), sa.ForeignKey("pull_requests.id"), nullable=False),
        sa.Column("status", sa.String(20), default="pending"),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("finished_at", sa.DateTime()),
        sa.Column("plan_storage_key", sa.String(255)),
        sa.Column("cost_delta_cents", sa.Integer()),
        sa.Column("risk_score", sa.Integer()),
        sa.Column("summary_md", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_analyses_pr", "analyses", ["pr_id"])

    op.create_table(
        "findings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("type", sa.String(20)),
        sa.Column("severity", sa.String(20)),
        sa.Column("resource", sa.String(255)),
        sa.Column("message", sa.Text()),
        sa.Column("suggestion", sa.Text()),
        sa.Column("rule_id", sa.String(100)),
        sa.Column("controls", sa.JSON(), default=[]),
        sa.Column("extra", sa.JSON(), default={}),
    )
    op.create_index("ix_findings_analysis", "findings", ["analysis_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("actor", sa.String(255)),
        sa.Column("action", sa.String(100)),
        sa.Column("target", sa.String(255)),
        sa.Column("payload", sa.JSON(), default={}),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_org", "audit_log", ["org_id"])
    op.create_index("ix_audit_created", "audit_log", ["created_at"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("findings")
    op.drop_table("analyses")
    op.drop_table("pull_requests")
    op.drop_table("repositories")
    op.drop_table("organizations")
