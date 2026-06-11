"""stripe webhook idempotency: processed_stripe_events

Revision ID: 011
Revises: 010
Create Date: 2026-06-10

"""

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS processed_stripe_events (
            event_id VARCHAR(64) PRIMARY KEY,
            event_type VARCHAR(64) NOT NULL,
            processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS processed_stripe_events")
