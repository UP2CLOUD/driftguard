"""008_analysis_contact_email

Add contact_email column to analyses table (missing from initial schema).

Revision ID: 008
Revises: 007
Create Date: 2026-06-04
"""

from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("contact_email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "contact_email")
