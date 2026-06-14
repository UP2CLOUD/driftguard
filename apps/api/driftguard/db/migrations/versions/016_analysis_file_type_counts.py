"""feat: add tf_files, k8s_files, gha_files counts to analyses table

Revision ID: 016
Revises: 015
Create Date: 2026-06-14

Store per-file-type scan counts on each analysis so the scan result API can
return accurate tf_files / k8s_files / gha_files instead of zeros.

"""

import sqlalchemy as sa
from alembic import op

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("tf_files", sa.Integer(), nullable=True))
    op.add_column("analyses", sa.Column("k8s_files", sa.Integer(), nullable=True))
    op.add_column("analyses", sa.Column("gha_files", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("analyses", "gha_files")
    op.drop_column("analyses", "k8s_files")
    op.drop_column("analyses", "tf_files")
