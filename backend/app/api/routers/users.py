from fastapi import APIRouter, Response

from app.api.cookies import clear_refresh
from app.api.dependencies import CurrentUser, Session
from app.schemas.contracts import (
    Message,
    PasswordChange,
    ProfileUpdate,
    UserView,
)
from app.services import auth

router = APIRouter(prefix="/api")


@router.get("/users/me", response_model=UserView, tags=["users"])
async def me(user: CurrentUser) -> UserView:
    return UserView.model_validate(user)


@router.patch("/users/me", response_model=UserView, tags=["users"])
async def update_profile(payload: ProfileUpdate, user: CurrentUser, session: Session) -> UserView:
    return await auth.update_profile(session, user, payload)


@router.post("/users/me/password", response_model=Message, tags=["users"])
async def change_password(
    payload: PasswordChange, user: CurrentUser, session: Session, response: Response
) -> Message:
    await auth.change_password(session, user, payload)
    clear_refresh(response)
    return Message(message="Пароль изменён. Войдите снова на всех устройствах.")
