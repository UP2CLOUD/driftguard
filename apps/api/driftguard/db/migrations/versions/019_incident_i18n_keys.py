"""incident i18n keys: translate generated text at display time

Incident title/description/root_cause/suggested_fix were written to the
database as English at creation time, so a PT-BR (or any non-English) user
saw English body copy no matter what locale they picked -- the page chrome
was translated but the content was not.

Translating at *write* time would be wrong: an organization has many users
with different locales, and switching locale later could not retranslate
rows already stored. So these columns record the stable identity of the
generated text instead, and the UI resolves it per viewer.

All three are nullable and purely additive. Rows written before this
migration keep their English text and the UI falls back to it, so nothing
regresses and no backfill is required.

Revision ID: 019
Revises: 018
"""

import sqlalchemy as sa
from alembic import op

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Scanner rule that produced the finding (TF001, K8S003, GHA002, ...).
    # Lets the UI translate the description and title via a rule catalog.
    op.add_column("drift_incidents", sa.Column("rule_id", sa.String(64), nullable=True))
    # Identity of the deterministic hint templates in api/v1/ingest.py.
    op.add_column("drift_incidents", sa.Column("root_cause_key", sa.String(64), nullable=True))
    op.add_column("drift_incidents", sa.Column("suggested_fix_key", sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column("drift_incidents", "suggested_fix_key")
    op.drop_column("drift_incidents", "root_cause_key")
    op.drop_column("drift_incidents", "rule_id")
