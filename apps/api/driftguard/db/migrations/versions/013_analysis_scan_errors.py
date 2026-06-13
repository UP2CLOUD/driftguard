"""analysis scan_errors: persist non-fatal scanner errors per analysis

Revision ID: 013
Revises: 012
Create Date: 2026-06-13

"""

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE analyses
        ADD COLUMN IF NOT EXISTS scan_errors JSONB
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE analyses DROP COLUMN IF EXISTS scan_errors")
