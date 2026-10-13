"""Record separate document acceptance without backfilling existing accounts."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "62ea39bf8140"
down_revision: str | None = "18af27c94312"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("terms_version", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("data_consent_version", sa.String(32), nullable=True))
    op.add_column(
        "users", sa.Column("legal_accepted_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "legal_accepted_at")
    op.drop_column("users", "data_consent_version")
    op.drop_column("users", "terms_version")
