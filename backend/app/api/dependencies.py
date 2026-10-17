from typing import Annotated, cast

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.domain.errors import DependencyUnavailable, PermissionDenied
from app.models.tables import User
from app.ports.execution import ExecutionRunner
from app.services import auth

Session = Annotated[AsyncSession, Depends(get_session, scope="function")]
bearer = HTTPBearer(auto_error=False)


async def current_user(
    session: Session, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> User:
    return await auth.current_user(session, credentials.credentials if credentials else None)


CurrentUser = Annotated[User, Depends(current_user)]


def require_origin(request: Request) -> None:
    if request.headers.get("origin") != get_settings().allowed_origin:
        raise HTTPException(403, "Недопустимый источник запроса")


async def admin_user(user: CurrentUser) -> User:
    if user.role != "admin":
        raise PermissionDenied("Требуется роль администратора")
    return user


AdminUser = Annotated[User, Depends(admin_user)]


def get_runner(request: Request) -> ExecutionRunner:
    runner = getattr(request.app.state, "execution_runner", None)
    if runner is None:
        raise DependencyUnavailable("Runner ещё не инициализирован")
    return cast(ExecutionRunner, runner)
