"""009_findings_rich_fields

Add category, title, file, line, controls to findings table.
These fields are produced by the static IaC scanner but were not
previously persisted.

Revision ID: 009
Revises: 008
Create Date: 2026-06-05
"""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE findings ADD COLUMN IF NOT EXISTS category VARCHAR(64)")
    op.execute("ALTER TABLE findings ADD COLUMN IF NOT EXISTS title VARCHAR(512)")
    op.execute("ALTER TABLE findings ADD COLUMN IF NOT EXISTS file VARCHAR(512)")
    op.execute("ALTER TABLE findings ADD COLUMN IF NOT EXISTS line INTEGER")
    op.execute("ALTER TABLE findings ADD COLUMN IF NOT EXISTS controls JSONB")


def downgrade() -> None:
    op.drop_column("findings", "controls")
    op.drop_column("findings", "line")
    op.drop_column("findings", "file")
    op.drop_column("findings", "title")
    op.drop_column("findings", "category")
