"""Explicit one-transaction reset retaining exactly one existing user account."""

import argparse
import asyncio

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionFactory, engine
from app.models.tables import Base, User
from app.seed import seed


async def reset_learning(session: AsyncSession, keep_email: str) -> dict[str, int]:
    if session.bind is not None and session.bind.dialect.name == "postgresql":
        await session.execute(text("LOCK TABLE users IN ACCESS EXCLUSIVE MODE"))
    matches = list(
        await session.scalars(
            select(User).where(func.lower(User.email) == keep_email.strip().lower())
        )
    )
    if len(matches) != 1:
        raise ValueError(
            "Reset refused: expected exactly one existing user with the preserved email"
        )
    kept = matches[0]
    before = await session.scalar(select(func.count()).select_from(User)) or 0
    for table in reversed(Base.metadata.sorted_tables):
        if table.name != "users":
            await session.execute(delete(table))
    await session.execute(delete(User).where(User.id != kept.id))
    kept.total_xp = kept.current_level = kept.streak = kept.longest_streak = 0
    kept.last_activity = None
    await session.flush()
    await seed(session)
    return {"users_before": before, "users_deleted": before - 1, "users_remaining": 1}


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep-email", required=True)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform the reset; otherwise only check the preserved account",
    )
    args = parser.parse_args()
    try:
        async with SessionFactory.begin() as session:
            if args.apply:
                report = await reset_learning(session, args.keep_email)
            else:
                count = await session.scalar(
                    select(func.count())
                    .select_from(User)
                    .where(func.lower(User.email) == args.keep_email.strip().lower())
                )
                print({"preserved_email_matches": count, "applied": False})
        if args.apply:
            print(report)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
