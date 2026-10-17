from fastapi import APIRouter

from app.api.dependencies import CurrentUser, Session
from app.schemas.contracts import (
    AchievementView,
    ProgressView,
)
from app.services import progress as progress_service

router = APIRouter(prefix="/api")


@router.get("/progress", response_model=ProgressView, tags=["progress"])
async def progress(user: CurrentUser, session: Session) -> ProgressView:
    return await progress_service.get_progress(session, user)


@router.get("/achievements", response_model=list[AchievementView], tags=["progress"])
async def achievements(user: CurrentUser, session: Session) -> list[AchievementView]:
    return await progress_service.list_achievements(session, user)
