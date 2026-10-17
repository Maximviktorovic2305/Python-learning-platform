from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import CurrentUser, Session, get_runner
from app.ports.execution import ExecutionRunner
from app.schemas.contracts import (
    CodeSubmission,
    ExecutionResult,
    ExerciseView,
    LessonView,
    Message,
)
from app.services import catalog as catalog_service
from app.services import exercises as exercise_service

router = APIRouter(prefix="/api")


@router.get("/lessons/{topic_id}", response_model=LessonView, tags=["learning"])
async def lesson(topic_id: str, session: Session) -> LessonView:
    return await catalog_service.get_lesson(session, topic_id)


@router.post("/lessons/{topic_id}/complete", response_model=Message, tags=["learning"])
async def complete_lesson(topic_id: str, user: CurrentUser, session: Session) -> Message:
    xp = await exercise_service.complete_lesson(session, user, topic_id)
    return Message(message=f"Урок завершён. +{xp} XP")


@router.get("/exercises", response_model=list[ExerciseView], tags=["learning"])
async def exercises(topic_id: str, session: Session) -> list[ExerciseView]:
    return await exercise_service.exercises(session, topic_id)


@router.get("/tasks", response_model=list[ExerciseView], tags=["learning"])
async def tasks(session: Session) -> list[ExerciseView]:
    return await exercise_service.tasks(session)


@router.post("/exercises/{exercise_id}/submit", response_model=ExecutionResult, tags=["learning"])
async def submit_exercise(
    exercise_id: str,
    payload: CodeSubmission,
    user: CurrentUser,
    session: Session,
    runner: Annotated[ExecutionRunner, Depends(get_runner)],
) -> ExecutionResult:
    return await exercise_service.submit_exercise(session, user, exercise_id, payload.code, runner)
