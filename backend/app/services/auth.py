from asyncio import to_thread
from datetime import UTC, datetime, timedelta
from uuid import UUID

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
from app.models.tables import AuthSession, UsedRefreshToken, User
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
        password_hash=await to_thread(hash_password, payload.password),
    )
    session.add(user)
    await session.flush()
    return await create_session(session, user)


async def login(session: AsyncSession, payload: Login) -> tuple[AuthView, str]:
    user = await session.scalar(
        select(User).where(User.email == str(payload.email).lower()).with_for_update()
    )
    valid = await to_thread(
        verify_password, payload.password, user.password_hash if user else DUMMY_HASH
    )
    if user is None or not valid:
        raise HTTPException(401, "Неверный email или пароль")
    return await create_session(session, user)


async def refresh_session_id(session: AsyncSession, token: str) -> UUID | None:
    digest = token_digest(token)
    return await session.scalar(
        select(AuthSession.id)
        .where(AuthSession.token_hash == digest)
        .union(select(UsedRefreshToken.session_id).where(UsedRefreshToken.token_hash == digest))
    )


async def refresh(session: AsyncSession, token: str) -> tuple[AuthView, str] | None:
    session_id = await refresh_session_id(session, token)
    if session_id is None:
        return None
    # Lock by the stable ID: concurrent rotation must still find the session.
    auth_session = await session.scalar(
        select(AuthSession).where(AuthSession.id == session_id).with_for_update()
    )
    now = datetime.now(UTC)
    if (
        auth_session is None
        or auth_session.revoked
        or auth_session.expires_at.replace(tzinfo=UTC) <= now
    ):
        return None
    if auth_session.token_hash != token_digest(token):
        # Return normally so the transaction commits this security revocation.
        # Raising HTTPException here would roll it back in get_session().
        auth_session.revoked = True
        return None
    user = await session.get(User, auth_session.user_id)
    if user is None:
        return None
    new_token = new_refresh_token()
    session.add(UsedRefreshToken(token_hash=auth_session.token_hash, session_id=auth_session.id))
    auth_session.token_hash = token_digest(new_token)
    return AuthView(
        access_token=access_token(user.id, auth_session.id), user=UserView.model_validate(user)
    ), new_token


async def revoke_sessions(session: AsyncSession, user: User) -> None:
    await session.execute(
        update(AuthSession).where(AuthSession.user_id == user.id).values(revoked=True)
    )
