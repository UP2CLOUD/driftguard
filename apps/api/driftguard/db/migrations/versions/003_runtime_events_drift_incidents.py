"""runtime_events + drift_incidents tables

Revision ID: 003
Revises: 002
Create Date: 2026-05-22
"""

import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "runtime_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
        ),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False, index=True),
        sa.Column("severity", sa.String(16), nullable=False, server_default="info"),
        sa.Column("source", sa.String(64), nullable=False, server_default="driftguard"),
        sa.Column("message", sa.Text, nullable=False, server_default=""),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_runtime_events_created_at", "runtime_events", ["created_at"])

    op.create_table(
        "drift_incidents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
        ),
        sa.Column("repo_id", sa.String(36), sa.ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("root_cause", sa.Text, nullable=True),
        sa.Column("suggested_fix", sa.Text, nullable=True),
        sa.Column("recurrence_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("fingerprint", sa.String(64), nullable=True, index=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_drift_incidents_created_at", "drift_incidents", ["created_at"])


def downgrade() -> None:
    op.drop_table("drift_incidents")
    op.drop_table("runtime_events")
