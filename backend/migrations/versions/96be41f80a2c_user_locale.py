"""Persist the preferred interface language without changing learning records."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "96be41f80a2c"
down_revision: str | None = "7d91c4f203ab"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("locale", sa.String(10), server_default="ru", nullable=False))


def downgrade() -> None:
    op.drop_column("users", "locale")
