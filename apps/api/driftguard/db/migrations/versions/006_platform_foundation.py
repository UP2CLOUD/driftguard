"""006_platform_foundation

API tokens, org members, terraform resource snapshots.

Revision ID: 006
Revises: 005
Create Date: 2026-05-23
"""

import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── API tokens ─────────────────────────────────────────────────────────────
    op.create_table(
        "api_tokens",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("role", sa.String(32), nullable=False, server_default="org:member"),
        sa.Column("scopes", sa.String(512), nullable=True),
        sa.Column("revoked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_by", sa.String(64), nullable=True),
    )
    op.create_index("ix_api_tokens_org_id", "api_tokens", ["org_id"])

    # ── Org members ────────────────────────────────────────────────────────────
    op.create_table(
        "org_members",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("github_login", sa.String(64), nullable=False),
        sa.Column("role", sa.String(32), nullable=False, server_default="org:member"),
        sa.Column("invited_by", sa.String(64), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_org_members_org_id", "org_members", ["org_id"])
    op.create_index("ix_org_members_github_login", "org_members", ["github_login"])
    op.create_unique_constraint("uq_org_member", "org_members", ["org_id", "github_login"])

    # ── Terraform resource snapshots ───────────────────────────────────────────
    op.create_table(
        "terraform_resources",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("address", sa.String(512), nullable=False),
        sa.Column("type", sa.String(128), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(255), nullable=False, server_default=""),
        sa.Column("module", sa.String(512), nullable=True),
        sa.Column("action", sa.String(32), nullable=False, server_default="update"),
        sa.Column("attributes", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("is_destructive", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("touches_sensitive", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("risk_score", sa.Integer, nullable=True),
        sa.Column("snapshotted_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_tf_resources_org_id", "terraform_resources", ["org_id"])
    op.create_index("ix_tf_resources_repo_id", "terraform_resources", ["repo_id"])
    op.create_index("ix_tf_resources_address", "terraform_resources", ["address"])
    op.create_index("ix_tf_resources_type", "terraform_resources", ["type"])
    op.create_index("ix_tf_resources_snap_at", "terraform_resources", ["snapshotted_at"])

    # ── Backfill org members from existing orgs (installer = owner) ───────────
    op.execute("""
        INSERT INTO org_members (id, org_id, github_login, role, joined_at)
        SELECT
            gen_random_uuid()::text,
            id,
            COALESCE(settings->>'account_login', 'unknown'),
            'org:owner',
            created_at
        FROM organizations
        WHERE settings->>'account_login' IS NOT NULL
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table("terraform_resources")
    op.drop_table("org_members")
    op.drop_table("api_tokens")
