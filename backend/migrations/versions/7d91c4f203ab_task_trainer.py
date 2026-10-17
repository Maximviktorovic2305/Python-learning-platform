"""Independent task catalogue without altering course completion requirements."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7d91c4f203ab"
down_revision: str | None = "62ea39bf8140"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("exercises", "topic_id", existing_type=sa.String(80), nullable=True)
    op.add_column(
        "exercises", sa.Column("catalog", sa.String(20), server_default="lesson", nullable=False)
    )
    op.add_column("exercises", sa.Column("tags", sa.JSON(), server_default="[]", nullable=False))
    op.create_index("ix_exercises_catalog", "exercises", ["catalog"])


def downgrade() -> None:
    op.execute(
        "DELETE FROM exercise_tests WHERE exercise_id IN (SELECT id FROM exercises WHERE catalog = 'trainer')"
    )
    op.execute("DELETE FROM exercises WHERE catalog = 'trainer'")
    op.drop_index("ix_exercises_catalog", table_name="exercises")
    op.drop_column("exercises", "tags")
    op.drop_column("exercises", "catalog")
    op.alter_column("exercises", "topic_id", existing_type=sa.String(80), nullable=False)
