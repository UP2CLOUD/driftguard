"""perf: add missing indexes on analyses.started_at and drift_incidents

Revision ID: 014
Revises: 013
Create Date: 2026-06-13

analyses.started_at is queried in every dashboard load (7d/30d windows,
ORDER BY for recent list) but had no index — causing full table scans.
Also add a composite index to accelerate the most common join pattern.

"""

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Primary bottleneck: every /dashboard/overview call filters + sorts by started_at
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyses_started_at ON analyses (started_at DESC NULLS LAST)")
    # Accelerate the frequent join: analyses → pull_requests → repositories (org_id filter)
    # This composite index covers the org-scoped 7d/30d count queries.
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyses_pr_started ON analyses (pr_id, started_at DESC NULLS LAST)")
    # findings joined to analyses for severity breakdown — analysis_id already indexed,
    # but the scan_errors column may benefit from a partial index later; skip for now.


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_analyses_started_at")
    op.execute("DROP INDEX IF EXISTS ix_analyses_pr_started")
