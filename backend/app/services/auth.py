from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    access_token,
    hash_password,
    new_refresh_token,
    token_digest,
    verify_password,
)
from app.models.tables import AuthSession, User
from app.schemas.contracts import AuthView, Login, Register, UserView

DUMMY_HASH = hash_password("timing-equalization-not-an-account-password")


async def create_session(session: AsyncSession, user: User) -> tuple[AuthView, str]:
    token = new_refresh_token()
    auth_session = AuthSession(
        user_id=user.id,
        token_hash=token_digest(token),
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    session.add(auth_session)
    await session.flush()
    return AuthView(
        access_token=access_token(user.id, auth_session.id), user=UserView.model_validate(user)
    ), token


async def register(session: AsyncSession, payload: Register) -> tuple[AuthView, str]:
    user = User(
        email=str(payload.email).lower(),
        username=payload.username,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.flush()
    return await create_session(session, user)


async def login(session: AsyncSession, payload: Login) -> tuple[AuthView, str]:
    user = await session.scalar(select(User).where(User.email == str(payload.email).lower()))
    valid = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not valid:
        raise HTTPException(401, "Неверный email или пароль")
    return await create_session(session, user)


async def refresh(session: AsyncSession, token: str) -> tuple[AuthView, str]:
    auth_session = await session.scalar(
        select(AuthSession).where(AuthSession.token_hash == token_digest(token)).with_for_update()
    )
    now = datetime.now(UTC)
    if (
        auth_session is None
        or auth_session.revoked
        or auth_session.expires_at.replace(tzinfo=UTC) <= now
    ):
        raise HTTPException(401, "Сессия завершена")
    user = await session.get(User, auth_session.user_id)
    if user is None:
        raise HTTPException(401, "Сессия завершена")
    new_token = new_refresh_token()
    auth_session.token_hash = token_digest(new_token)
    return AuthView(
        access_token=access_token(user.id, auth_session.id), user=UserView.model_validate(user)
    ), new_token


async def revoke_sessions(session: AsyncSession, user: User) -> None:
    await session.execute(
        update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True)
    )
