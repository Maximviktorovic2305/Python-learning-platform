from asyncio import to_thread
from datetime import UTC, datetime, timedelta
from uuid import UUID

from jwt import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    access_token,
    decode_access,
    hash_password,
    new_refresh_token,
    token_digest,
    verify_password,
)
from app.domain.errors import AuthenticationRequired, InvalidRequest
from app.domain.locales import Locale
from app.models.tables import AuthSession, UsedRefreshToken, User
from app.repositories import users as records
from app.schemas.contracts import AuthView, Login, PasswordChange, ProfileUpdate, Register, UserView

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
        terms_version=payload.legal_version,
        data_consent_version=payload.legal_version,
        legal_accepted_at=datetime.now(UTC),
        username=payload.username,
        locale=payload.locale,
        password_hash=await to_thread(hash_password, payload.password),
    )
    session.add(user)
    await session.flush()
    return await create_session(session, user)


async def login(session: AsyncSession, payload: Login) -> tuple[AuthView, str]:
    user = await records.user_by_email_for_update(session, str(payload.email).lower())
    valid = await to_thread(
        verify_password, payload.password, user.password_hash if user else DUMMY_HASH
    )
    if user is None or not valid:
        raise AuthenticationRequired("Неверный email или пароль")
    return await create_session(session, user)


async def refresh_session_id(session: AsyncSession, token: str) -> UUID | None:
    return await records.refresh_session_id(session, token_digest(token))


async def refresh(session: AsyncSession, token: str) -> tuple[AuthView, str] | None:
    session_id = await refresh_session_id(session, token)
    if session_id is None:
        return None
    # Lock by the stable ID: concurrent rotation must still find the session.
    auth_session = await records.auth_session(session, session_id, lock=True)
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
    user = await records.user_by_id(session, auth_session.user_id)
    if user is None:
        return None
    new_token = new_refresh_token()
    session.add(UsedRefreshToken(token_hash=auth_session.token_hash, session_id=auth_session.id))
    auth_session.token_hash = token_digest(new_token)
    return AuthView(
        access_token=access_token(user.id, auth_session.id), user=UserView.model_validate(user)
    ), new_token


async def revoke_sessions(session: AsyncSession, user: User) -> None:
    await records.revoke_sessions(session, user.id)


async def current_user(session: AsyncSession, token: str | None) -> User:
    try:
        if token is None:
            raise ValueError("Missing token")
        uid, sid = decode_access(token)
        current = await records.auth_session(session, sid)
        if (
            current is None
            or current.user_id != uid
            or current.revoked
            or current.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC)
        ):
            raise ValueError("Expired session")
        user = await records.user_by_id(session, uid)
        if user is None:
            raise ValueError("Missing user")
        return user
    except (InvalidTokenError, ValueError) as error:
        raise AuthenticationRequired("Войдите в аккаунт") from error


async def logout(session: AsyncSession, access: str | None, refresh_token: str | None) -> None:
    current: AuthSession | None = None
    if access:
        try:
            user_id, session_id = decode_access(access)
            candidate = await records.auth_session(session, session_id, lock=True)
            if candidate and candidate.user_id == user_id:
                current = candidate
        except InvalidTokenError, ValueError:
            pass
    if current is None and refresh_token:
        refresh_id = await refresh_session_id(session, refresh_token)
        if refresh_id is not None:
            current = await records.auth_session(session, refresh_id, lock=True)
    if current:
        current.revoked = True


async def update_profile(session: AsyncSession, user: User, payload: ProfileUpdate) -> UserView:
    await records.lock_user(session, user)
    if payload.locale is not None:
        user.locale = payload.locale
    user.username, user.daily_goal, user.timezone = (
        payload.username,
        payload.daily_goal,
        payload.timezone,
    )
    await session.flush()
    return UserView.model_validate(user)


async def change_password(session: AsyncSession, user: User, payload: PasswordChange) -> None:
    await records.lock_user(session, user)
    if not await to_thread(verify_password, payload.current_password, user.password_hash):
        raise InvalidRequest("Текущий пароль неверен")
    user.password_hash = await to_thread(hash_password, payload.new_password)
    await revoke_sessions(session, user)


async def update_locale(session: AsyncSession, user: User, locale: Locale) -> UserView:
    await records.lock_user(session, user)
    user.locale = locale
    await session.flush()
    return UserView.model_validate(user)
