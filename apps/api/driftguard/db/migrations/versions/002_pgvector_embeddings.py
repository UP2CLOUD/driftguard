"""pgvector: enable extension + incident_embeddings table

Revision ID: 002
Revises: 001
Create Date: 2026-05-19
"""
import sqlalchemy as sa
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Incident embeddings — one row per finding/analysis for semantic recall
    op.create_table(
        "incident_embeddings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("repo_full_name", sa.String(255), nullable=False),
        sa.Column("pr_number", sa.Integer, nullable=True),
        # Intent text that was embedded
        sa.Column("intent_text", sa.Text, nullable=False),
        # Embedding vector (384-d AllMiniLML6V2)
        sa.Column("embedding", sa.Text, nullable=True),  # stored as JSON array; pgvector col added below
        sa.Column("severity", sa.String(32), nullable=True),
        sa.Column("resource", sa.String(255), nullable=True),
        sa.Column("outcome", sa.String(32), nullable=True),  # blocked | warned | allowed
        sa.Column("blast_radius", sa.String(32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_incident_embeddings_org_id", "incident_embeddings", ["org_id"])
    op.create_index("ix_incident_embeddings_analysis_id", "incident_embeddings", ["analysis_id"])

    # Add the actual vector column (pgvector type)
    op.execute("ALTER TABLE incident_embeddings ADD COLUMN embedding_vec vector(384)")

    # HNSW index for fast ANN search (pgvector >= 0.5)
    op.execute("""
        CREATE INDEX ix_incident_embeddings_hnsw
        ON incident_embeddings
        USING hnsw (embedding_vec vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # Celery task results table (for tracking async jobs)
    op.create_table(
        "async_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("celery_task_id", sa.String(64), unique=True, nullable=True),
        sa.Column("org_id", sa.String(36), nullable=True),
        sa.Column("analysis_id", sa.String(36), nullable=True),
        sa.Column("status", sa.String(32), default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("async_jobs")
    op.drop_table("incident_embeddings")
    op.execute("DROP EXTENSION IF EXISTS vector")
