from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import AuthSession, UsedRefreshToken, User


async def lock_user(session: AsyncSession, user: User) -> None:
    await session.refresh(user, with_for_update=True)


async def user_by_id(session: AsyncSession, user_id: UUID) -> User | None:
    return await session.get(User, user_id)


async def user_by_email_for_update(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email).with_for_update())


async def auth_session(
    session: AsyncSession, session_id: UUID, *, lock: bool = False
) -> AuthSession | None:
    return await session.get(AuthSession, session_id, with_for_update=lock)


async def refresh_session_id(session: AsyncSession, digest: str) -> UUID | None:
    return await session.scalar(
        select(AuthSession.id)
        .where(AuthSession.token_hash == digest)
        .union(select(UsedRefreshToken.session_id).where(UsedRefreshToken.token_hash == digest))
    )


async def revoke_sessions(session: AsyncSession, user_id: UUID) -> None:
    await session.execute(
        update(AuthSession).where(AuthSession.user_id == user_id).values(revoked=True)
    )
