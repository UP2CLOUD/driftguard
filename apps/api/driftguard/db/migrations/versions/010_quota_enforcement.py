"""quota enforcement: subscription_status, monthly_usage, scan_runs

Revision ID: 010
Revises: 009
Create Date: 2026-06-08

"""

from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # All statements use IF NOT EXISTS so re-running after a partial failure is safe.
    op.execute(
        "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'free'"
    )

    op.execute("""
        CREATE TABLE IF NOT EXISTS monthly_usage (
            id VARCHAR(36) PRIMARY KEY,
            org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            month VARCHAR(7) NOT NULL,
            pr_count INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT uq_monthly_usage_org_month UNIQUE (org_id, month)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_monthly_usage_org ON monthly_usage (org_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS scan_runs (
            id VARCHAR(36) PRIMARY KEY,
            org_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            repo_id VARCHAR(36) NOT NULL,
            pr_number INTEGER NOT NULL,
            head_sha VARCHAR(40) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT uq_scan_run UNIQUE (org_id, repo_id, pr_number, head_sha)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_scan_runs_org ON scan_runs (org_id)")


def downgrade() -> None:
    op.drop_table("scan_runs")
    op.drop_table("monthly_usage")
    op.drop_column("organizations", "subscription_status")
