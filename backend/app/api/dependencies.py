from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.core.security import decode_access
from app.models.tables import AuthSession, User

Session = Annotated[AsyncSession, Depends(get_session, scope="function")]
bearer = HTTPBearer(auto_error=False)


async def current_user(
    session: Session, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> User:
    try:
        if credentials is None:
            raise ValueError("Missing token")
        uid, sid = decode_access(credentials.credentials)
        auth_session = await session.get(AuthSession, sid)
        if (
            auth_session is None
            or auth_session.user_id != uid
            or auth_session.revoked
            or auth_session.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC)
        ):
            raise ValueError("Expired session")
        user = await session.get(User, uid)
        if user is None:
            raise ValueError("Missing user")
        return user
    except (jwt.InvalidTokenError, ValueError) as error:
        raise HTTPException(
            401, "Войдите в аккаунт", headers={"WWW-Authenticate": "Bearer"}
        ) from error


CurrentUser = Annotated[User, Depends(current_user)]


def require_origin(request: Request) -> None:
    if request.headers.get("origin") != get_settings().allowed_origin:
        raise HTTPException(403, "Недопустимый источник запроса")


async def admin_user(user: CurrentUser) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Требуется роль администратора")
    return user


AdminUser = Annotated[User, Depends(admin_user)]
