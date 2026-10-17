from asyncio import to_thread
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from jwt import InvalidTokenError
from sqlalchemy import func, select, text

from app.api.dependencies import AdminUser, CurrentUser, Session, bearer, require_origin
from app.content.exercises import exercise_starter, local_supported
from app.core.config import get_settings
from app.core.security import decode_access, hash_password, verify_password
from app.models.tables import (
    Achievement,
    AuthSession,
    Exercise,
    ExerciseTest,
    Lesson,
    Project,
    ProjectSubmission,
    Question,
    QuizAttempt,
    Topic,
    UserAchievement,
)
from app.repositories.catalog import course_catalog
from app.schemas.contracts import (
    AchievementView,
    AttemptResult,
    AttemptSubmission,
    AttemptView,
    AuthView,
    CodeExample,
    CodeSubmission,
    CourseView,
    ExecutionResult,
    ExerciseView,
    LessonView,
    LevelView,
    Login,
    Message,
    ModuleView,
    PasswordChange,
    ProfileUpdate,
    ProgressView,
    ProjectInput,
    ProjectSubmissionView,
    ProjectView,
    QuestionView,
    Register,
    TheorySection,
    TopicView,
    UserView,
)
from app.services import auth
from app.services.execution import ExecutionRequest, ExecutionRunner, TestCase, get_runner
from app.services.progress import award, get_progress
from app.services.quizzes import attempt_result, start_attempt, submit_attempt

router = APIRouter(prefix="/api")


@router.get("/questions", response_model=list[QuestionView], tags=["questions"])
async def questions(
    topic_id: str,
    session: Session,
    limit: Annotated[int, Query(ge=1, le=100)] = 32,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[QuestionView]:
    topic = await session.get(Topic, topic_id)
    if topic is None or not topic.published:
        raise HTTPException(404, "Опубликованная тема не найдена")
    rows = await session.scalars(
        select(Question)
        .where(Question.topic_id == topic_id)
        .order_by(Question.id)
        .offset(offset)
        .limit(limit)
    )
    return [QuestionView.model_validate(question) for question in rows]


def set_refresh(response: Response, token: str) -> None:
    response.set_cookie(
        "refresh",
        token,
        httponly=True,
        secure=get_settings().cookie_secure,
        samesite="strict",
        max_age=30 * 86400,
        path="/api/auth",
    )
    response.headers["Cache-Control"] = "no-store"


def clear_refresh(response: Response) -> None:
    response.delete_cookie(
        "refresh",
        path="/api/auth",
        secure=get_settings().cookie_secure,
        httponly=True,
        samesite="strict",
    )
    response.headers["Cache-Control"] = "no-store"


@router.get("/health", response_model=Message, tags=["operations"])
async def health(session: Session) -> Message:
    await session.execute(text("SELECT 1"))
    return Message(message="ok")


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
    auth_session: AuthSession | None = None
    if credentials:
        try:
            user_id, session_id = decode_access(credentials.credentials)
            candidate = await session.get(AuthSession, session_id, with_for_update=True)
            if candidate and candidate.user_id == user_id:
                auth_session = candidate
        except InvalidTokenError, ValueError:
            pass
    if auth_session is None and token:
        refresh_id = await auth.refresh_session_id(session, token)
        if refresh_id is not None:
            auth_session = await session.get(AuthSession, refresh_id, with_for_update=True)
    if auth_session:
        # Revoke the stable session even if refresh rotated after the logout request started.
        auth_session.revoked = True
    clear_refresh(response)
    return Message(message="Вы вышли из аккаунта")


@router.get("/users/me", response_model=UserView, tags=["users"])
async def me(user: CurrentUser) -> UserView:
    return UserView.model_validate(user)


@router.patch("/users/me", response_model=UserView, tags=["users"])
async def update_profile(payload: ProfileUpdate, user: CurrentUser, session: Session) -> UserView:
    user.username, user.daily_goal, user.timezone = (
        payload.username,
        payload.daily_goal,
        payload.timezone,
    )
    await session.flush()
    return UserView.model_validate(user)


@router.post("/users/me/password", response_model=Message, tags=["users"])
async def change_password(
    payload: PasswordChange, user: CurrentUser, session: Session, response: Response
) -> Message:
    await session.refresh(user, with_for_update=True)
    if not await to_thread(verify_password, payload.current_password, user.password_hash):
        raise HTTPException(400, "Текущий пароль неверен")
    user.password_hash = await to_thread(hash_password, payload.new_password)
    await auth.revoke_sessions(session, user)
    clear_refresh(response)
    return Message(message="Пароль изменён. Войдите снова на всех устройствах.")


@router.get("/courses", response_model=list[CourseView], tags=["catalog"])
async def courses(session: Session) -> list[CourseView]:
    catalog = await course_catalog(session)
    return [catalog] if catalog else []


@router.get("/courses/{course_id}", response_model=CourseView, tags=["catalog"])
async def course(course_id: str, session: Session) -> CourseView:
    catalog = await course_catalog(session, course_id)
    if catalog is None:
        raise HTTPException(404, "Курс не найден")
    return catalog


@router.get("/levels/{level_id}", response_model=LevelView, tags=["catalog"])
async def level(level_id: str, session: Session) -> LevelView:
    catalog = await course(session=session, course_id="python")
    result = next((item for item in catalog.levels if item.id == level_id), None)
    if result is None:
        raise HTTPException(404, "Уровень не найден")
    return result


@router.get("/modules/{module_id}", response_model=ModuleView, tags=["catalog"])
async def module(module_id: str, session: Session) -> ModuleView:
    catalog = await course(session=session, course_id="python")
    result = next((m for item in catalog.levels for m in item.modules if m.id == module_id), None)
    if result is None:
        raise HTTPException(404, "Модуль не найден")
    return result


@router.get("/topics/{topic_id}", response_model=TopicView, tags=["catalog"])
async def topic(topic_id: str, session: Session) -> TopicView:
    result = await session.get(Topic, topic_id)
    if result is None:
        raise HTTPException(404, "Тема не найдена")
    distribution = {
        difficulty: int(count)
        for difficulty, count in await session.execute(
            select(Exercise.difficulty, func.count())
            .where(Exercise.topic_id == topic_id)
            .group_by(Exercise.difficulty)
        )
    }
    return TopicView.model_validate(result).model_copy(
        update={
            "exercise_count": sum(distribution.values()),
            "question_count": await session.scalar(
                select(func.count()).select_from(Question).where(Question.topic_id == topic_id)
            )
            or 0,
            "practice_difficulties": distribution,
        }
    )


@router.get("/lessons/{topic_id}", response_model=LessonView, tags=["learning"])
async def lesson(topic_id: str, session: Session) -> LessonView:
    t = await topic(topic_id, session)
    result = await session.get(Lesson, topic_id)
    if not t.published or result is None:
        raise HTTPException(404, "Урок ещё не опубликован")
    return LessonView(
        id=result.id,
        topic=t,
        theory=[TheorySection.model_validate(s) for s in result.theory],
        examples=[CodeExample.model_validate(e) for e in result.examples],
        review=result.review,
        exercise_count=t.exercise_count,
        question_count=t.question_count,
    )


@router.post("/lessons/{topic_id}/complete", response_model=Message, tags=["learning"])
async def complete_lesson(topic_id: str, user: CurrentUser, session: Session) -> Message:
    await lesson(topic_id, session)
    xp = await award(session, user, "lesson", topic_id, topic_id, 20)
    return Message(message=f"Урок завершён. +{xp} XP")


@router.get("/exercises", response_model=list[ExerciseView], tags=["learning"])
async def exercises(topic_id: str, session: Session) -> list[ExerciseView]:
    await topic(topic_id, session)
    items = list(
        await session.scalars(
            select(Exercise).where(Exercise.topic_id == topic_id).order_by(Exercise.id)
        )
    )
    return await exercise_views(items, session)


@router.get("/tasks", response_model=list[ExerciseView], tags=["learning"])
async def tasks(session: Session) -> list[ExerciseView]:
    items = list(
        await session.scalars(
            select(Exercise).where(Exercise.catalog == "trainer").order_by(Exercise.id)
        )
    )
    return await exercise_views(items, session)


async def exercise_views(items: list[Exercise], session: Session) -> list[ExerciseView]:
    examples = list(
        await session.scalars(
            select(ExerciseTest)
            .where(ExerciseTest.exercise_id.in_([item.id for item in items]))
            .order_by(ExerciseTest.id)
        )
    )
    return [
        ExerciseView.model_validate(e).model_copy(
            update={
                "starter_code": exercise_starter(e.solution),
                "kind": "code_writing" if e.kind == "refactoring" else e.kind,
                "sample_stdin": next(
                    (test.stdin.rstrip("\n") for test in examples if test.exercise_id == e.id), ""
                ),
                "test_count": sum(test.exercise_id == e.id for test in examples),
                "local_supported": local_supported(e.solution),
            }
        )
        for e in items
    ]


@router.post("/exercises/{exercise_id}/submit", response_model=ExecutionResult, tags=["learning"])
async def submit_exercise(
    exercise_id: str,
    payload: CodeSubmission,
    user: CurrentUser,
    session: Session,
    runner: Annotated[ExecutionRunner, Depends(get_runner)],
) -> ExecutionResult:
    exercise = await session.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(404, "Задание не найдено")
    tests = [
        TestCase(stdin=t.stdin, expected_stdout=t.expected_stdout)
        for t in await session.scalars(
            select(ExerciseTest).where(ExerciseTest.exercise_id == exercise_id)
        )
    ]
    result = await runner.execute(ExecutionRequest(code=payload.code, tests=tests))
    if (
        result.status == "passed"
        and result.total == len(tests)
        and result.passed == len(tests)
        and tests
    ):
        kind = "trainer" if exercise.catalog == "trainer" else "exercise"
        result.xp = await award(session, user, kind, exercise.id, exercise.topic_id, 30)
    return result


@router.post("/quizzes/{topic_id}/attempts", response_model=AttemptView, tags=["assessment"])
async def start_quiz(topic_id: str, user: CurrentUser, session: Session) -> AttemptView:
    return await start_attempt(session, user, topic_id)


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResult, tags=["assessment"])
async def finish_quiz(
    attempt_id: UUID, payload: AttemptSubmission, user: CurrentUser, session: Session
) -> AttemptResult:
    return await submit_attempt(session, user, attempt_id, payload)


@router.get("/attempts/{attempt_id}", response_model=AttemptResult, tags=["assessment"])
async def get_attempt(attempt_id: UUID, user: CurrentUser, session: Session) -> AttemptResult:
    attempt = await session.get(QuizAttempt, attempt_id)
    if attempt is None or attempt.user_id != user.id:
        raise HTTPException(404, "Попытка не найдена")
    return await attempt_result(session, attempt)


@router.get("/progress", response_model=ProgressView, tags=["progress"])
async def progress(user: CurrentUser, session: Session) -> ProgressView:
    return await get_progress(session, user)


@router.get("/achievements", response_model=list[AchievementView], tags=["progress"])
async def achievements(user: CurrentUser, session: Session) -> list[AchievementView]:
    earned = {
        a.achievement_id: a.earned_at
        for a in await session.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user.id)
        )
    }
    return [
        AchievementView(
            id=a.id,
            title=a.title,
            description=a.description,
            threshold=a.threshold,
            earned_at=earned.get(a.id),
        )
        for a in await session.scalars(select(Achievement).order_by(Achievement.threshold))
    ]


@router.get("/projects", response_model=list[ProjectView], tags=["projects"])
async def projects(session: Session) -> list[ProjectView]:
    return [
        ProjectView.model_validate(p)
        for p in await session.scalars(select(Project).order_by(Project.id))
    ]


@router.get("/projects/submissions", response_model=list[ProjectSubmissionView], tags=["projects"])
async def project_submissions(user: CurrentUser, session: Session) -> list[ProjectSubmissionView]:
    return [
        ProjectSubmissionView.model_validate(p)
        for p in await session.scalars(
            select(ProjectSubmission).where(ProjectSubmission.user_id == user.id)
        )
    ]


@router.post(
    "/projects/{project_id}/submissions", response_model=ProjectSubmissionView, tags=["projects"]
)
async def submit_project(
    project_id: str, payload: ProjectInput, user: CurrentUser, session: Session
) -> ProjectSubmissionView:
    if await session.get(Project, project_id) is None:
        raise HTTPException(404, "Проект не найден")
    await session.refresh(user, with_for_update=True)
    submission = await session.scalar(
        select(ProjectSubmission).where(
            ProjectSubmission.user_id == user.id, ProjectSubmission.project_id == project_id
        )
    )
    if submission is None:
        submission = ProjectSubmission(
            user_id=user.id,
            project_id=project_id,
            repository_url=str(payload.repository_url),
            notes=payload.notes,
        )
        session.add(submission)
    else:
        if submission.status == "approved":
            raise HTTPException(409, "Проект уже принят")
        submission.repository_url, submission.notes = str(payload.repository_url), payload.notes
        submission.status = "submitted"
    await session.flush()
    return ProjectSubmissionView.model_validate(submission)


@router.post(
    "/projects/submissions/{submission_id}/approve", response_model=Message, tags=["admin"]
)
async def approve_project(submission_id: UUID, admin: AdminUser, session: Session) -> Message:
    from app.models.tables import User

    submission = await session.get(ProjectSubmission, submission_id)
    if submission is None:
        raise HTTPException(404, "Работа не найдена")
    student = await session.get(User, submission.user_id)
    if student is None:
        raise HTTPException(404, "Пользователь не найден")
    submission.status = "approved"
    xp = await award(session, student, "project", submission.project_id, None, 500)
    return Message(message=f"Проект принят. +{xp} XP")
