"""github webhook replay protection: processed_github_deliveries

Revision ID: 012
Revises: 011
Create Date: 2026-06-12

"""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS processed_github_deliveries (
            delivery_id VARCHAR(64) PRIMARY KEY,
            event_type VARCHAR(64) NOT NULL,
            processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_processed_github_deliveries_processed_at "
        "ON processed_github_deliveries (processed_at)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS processed_github_deliveries")
