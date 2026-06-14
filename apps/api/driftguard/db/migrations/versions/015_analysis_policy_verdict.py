"""feat: add policy_verdict column to analyses table

Revision ID: 015
Revises: 014
Create Date: 2026-06-13

Store the policy engine verdict (pass / warn / block) on each analysis so
the dashboard and API can surface it without recomputing from findings.

"""

import sqlalchemy as sa
from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "analyses",
        sa.Column("policy_verdict", sa.String(16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyses", "policy_verdict")
