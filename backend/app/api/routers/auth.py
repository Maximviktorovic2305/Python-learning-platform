from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.api.cookies import clear_refresh, set_refresh
from app.api.dependencies import Session, bearer, require_origin
from app.schemas.contracts import (
    AuthView,
    Login,
    Message,
    Register,
)
from app.services import auth

router = APIRouter(prefix="/api")


@router.post(
    "/auth/register",
    response_model=AuthView,
    status_code=201,
    tags=["auth"],
    dependencies=[Depends(require_origin)],
)
async def register(payload: Register, session: Session, response: Response) -> AuthView:
    result, token = await auth.register(session, payload)
    set_refresh(response, token)
    return result


@router.post(
    "/auth/login", response_model=AuthView, tags=["auth"], dependencies=[Depends(require_origin)]
)
async def login(payload: Login, session: Session, response: Response) -> AuthView:
    result, token = await auth.login(session, payload)
    set_refresh(response, token)
    return result


@router.post(
    "/auth/refresh", response_model=AuthView, tags=["auth"], dependencies=[Depends(require_origin)]
)
async def refresh(
    session: Session,
    response: Response,
    token: Annotated[str | None, Cookie(alias="refresh")] = None,
) -> AuthView | JSONResponse:
    refreshed = await auth.refresh(session, token) if token else None
    if refreshed is None:
        # A response, rather than an exception, preserves replay revocation.
        failure = JSONResponse({"detail": "Сессия завершена"}, status_code=401)
        clear_refresh(failure)
        return failure
    result, rotated = refreshed
    set_refresh(response, rotated)
    return result


@router.post(
    "/auth/logout", response_model=Message, tags=["auth"], dependencies=[Depends(require_origin)]
)
async def logout(
    session: Session,
    response: Response,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    token: Annotated[str | None, Cookie(alias="refresh")] = None,
) -> Message:
    await auth.logout(session, credentials.credentials if credentials else None, token)
    clear_refresh(response)
    return Message(message="Вы вышли из аккаунта")
