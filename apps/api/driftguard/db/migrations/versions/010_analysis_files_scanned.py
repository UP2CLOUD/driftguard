"""010_analysis_files_scanned

Add files_scanned to analyses table so the API can return the real
count instead of a hardcoded zero.

Revision ID: 010
Revises: 009
Create Date: 2026-06-11
"""

import sqlalchemy as sa
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("files_scanned", sa.Integer, nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "files_scanned")
