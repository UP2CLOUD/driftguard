"""009_findings_rich_fields

Add category, title, file, line, controls to findings table.
These fields are produced by the static IaC scanner but were not
previously persisted.

Revision ID: 009
Revises: 008
Create Date: 2026-06-05
"""

import sqlalchemy as sa
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("findings", sa.Column("category", sa.String(64), nullable=True))
    op.add_column("findings", sa.Column("title", sa.String(512), nullable=True))
    op.add_column("findings", sa.Column("file", sa.String(512), nullable=True))
    op.add_column("findings", sa.Column("line", sa.Integer, nullable=True))
    op.add_column("findings", sa.Column("controls", sa.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("findings", "controls")
    op.drop_column("findings", "line")
    op.drop_column("findings", "file")
    op.drop_column("findings", "title")
    op.drop_column("findings", "category")
