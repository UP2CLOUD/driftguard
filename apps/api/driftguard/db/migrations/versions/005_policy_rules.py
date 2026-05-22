"""policy_rules table

Revision ID: 005
Revises: 004
Create Date: 2026-05-22
"""

import sqlalchemy as sa
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "policy_rules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
        ),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("rule_type", sa.String(64), nullable=False, server_default="block"),
        sa.Column("severity", sa.String(16), nullable=False, server_default="high"),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("conditions", sa.JSON, nullable=True),
        sa.Column("actions", sa.JSON, nullable=True),
        sa.Column("match_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("policy_rules")
