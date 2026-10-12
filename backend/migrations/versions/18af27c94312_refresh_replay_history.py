"""Remember consumed refresh digests to detect replay without storing secrets."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "18af27c94312"
down_revision: str | None = "30fc2006613f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "used_refresh_tokens",
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.PrimaryKeyConstraint("token_hash"),
        sa.ForeignKeyConstraint(["session_id"], ["auth_sessions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_used_refresh_tokens_session_id", "used_refresh_tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_used_refresh_tokens_session_id", table_name="used_refresh_tokens")
    op.drop_table("used_refresh_tokens")
