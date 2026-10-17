from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import CurrentUser, Session
from app.schemas.contracts import (
    AttemptResult,
    AttemptSubmission,
    AttemptView,
)
from app.services import quizzes as quiz_service

router = APIRouter(prefix="/api")


@router.post("/quizzes/{topic_id}/attempts", response_model=AttemptView, tags=["assessment"])
async def start_quiz(topic_id: str, user: CurrentUser, session: Session) -> AttemptView:
    return await quiz_service.start_attempt(session, user, topic_id)


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResult, tags=["assessment"])
async def finish_quiz(
    attempt_id: UUID, payload: AttemptSubmission, user: CurrentUser, session: Session
) -> AttemptResult:
    return await quiz_service.submit_attempt(session, user, attempt_id, payload)


@router.get("/attempts/{attempt_id}", response_model=AttemptResult, tags=["assessment"])
async def get_attempt(attempt_id: UUID, user: CurrentUser, session: Session) -> AttemptResult:
    return await quiz_service.get_attempt(session, user, attempt_id)
