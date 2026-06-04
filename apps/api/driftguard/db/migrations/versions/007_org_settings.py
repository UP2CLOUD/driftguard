"""007_org_settings

Add settings JSONB column to organizations.

Revision ID: 007
Revises: 006
Create Date: 2026-06-04
"""

import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("settings", sa.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "settings")
