from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.learning import QUESTION_BANK_REVISION
from app.models.tables import (
    Answer,
    Exercise,
    ExerciseTest,
    Lesson,
    Project,
    ProjectSubmission,
    Question,
    QuestionMemory,
    Quiz,
    QuizAttempt,
    Topic,
)


async def topic(session: AsyncSession, topic_id: str) -> Topic | None:
    return await session.get(Topic, topic_id)


async def topic_counts(session: AsyncSession, topic_id: str) -> tuple[dict[str, int], int]:
    distribution = {
        difficulty: int(count)
        for difficulty, count in await session.execute(
            select(Exercise.difficulty, func.count())
            .where(Exercise.topic_id == topic_id)
            .group_by(Exercise.difficulty)
        )
    }
    question_count = (
        await session.scalar(
            select(func.count())
            .select_from(Question)
            .where(
                Question.topic_id == topic_id,
                Question.id.like(Question.topic_id + f"-{QUESTION_BANK_REVISION}-%"),
            )
        )
        or 0
    )
    return distribution, question_count


async def lesson(session: AsyncSession, topic_id: str) -> Lesson | None:
    return await session.get(Lesson, topic_id)


async def exercises(
    session: AsyncSession, *, topic_id: str | None = None, catalog: str = "lesson"
) -> list[Exercise]:
    query = select(Exercise).where(Exercise.catalog == catalog)
    if topic_id is not None:
        query = query.where(Exercise.topic_id == topic_id)
    return list(await session.scalars(query.order_by(Exercise.id)))


async def exercise(session: AsyncSession, exercise_id: str) -> Exercise | None:
    return await session.get(Exercise, exercise_id)


async def exercise_tests(session: AsyncSession, ids: list[str]) -> list[ExerciseTest]:
    return list(
        await session.scalars(
            select(ExerciseTest).where(ExerciseTest.exercise_id.in_(ids)).order_by(ExerciseTest.id)
        )
    )


async def questions(
    session: AsyncSession, topic_id: str, *, limit: int | None = None, offset: int = 0
) -> list[Question]:
    query = (
        select(Question)
        .where(
            Question.topic_id == topic_id,
            Question.id.like(Question.topic_id + f"-{QUESTION_BANK_REVISION}-%"),
        )
        .order_by(Question.id)
        .offset(offset)
    )
    if limit is not None:
        query = query.limit(limit)
    return list(await session.scalars(query))


async def questions_by_ids(session: AsyncSession, ids: list[str]) -> dict[str, Question]:
    return {q.id: q for q in await session.scalars(select(Question).where(Question.id.in_(ids)))}


async def quiz(session: AsyncSession, quiz_id: str) -> Quiz | None:
    return await session.get(Quiz, quiz_id)


async def recent_question_ids(session: AsyncSession, user_id: UUID, quiz_id: str) -> set[str]:
    ids = await session.scalar(
        select(QuizAttempt.question_ids)
        .where(QuizAttempt.user_id == user_id, QuizAttempt.quiz_id == quiz_id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(1)
    )
    return set(ids or [])


async def attempt_for_user(
    session: AsyncSession, attempt_id: UUID, user_id: UUID, *, lock: bool = False
) -> QuizAttempt | None:
    query = select(QuizAttempt).where(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user_id)
    return await session.scalar(query.with_for_update() if lock else query)


async def question_memory(
    session: AsyncSession, user_id: UUID, question_id: str
) -> QuestionMemory | None:
    return await session.get(QuestionMemory, (user_id, question_id))


async def attempt_answers(session: AsyncSession, attempt_id: UUID) -> dict[str, Answer]:
    return {
        answer.question_id: answer
        for answer in await session.scalars(select(Answer).where(Answer.attempt_id == attempt_id))
    }


async def projects(session: AsyncSession) -> list[Project]:
    return list(await session.scalars(select(Project).order_by(Project.id)))


async def project(session: AsyncSession, project_id: str) -> Project | None:
    return await session.get(Project, project_id)


async def submissions(session: AsyncSession, user_id: UUID) -> list[ProjectSubmission]:
    return list(
        await session.scalars(select(ProjectSubmission).where(ProjectSubmission.user_id == user_id))
    )


async def project_submission(
    session: AsyncSession, user_id: UUID, project_id: str
) -> ProjectSubmission | None:
    return await session.scalar(
        select(ProjectSubmission).where(
            ProjectSubmission.user_id == user_id, ProjectSubmission.project_id == project_id
        )
    )


async def submission_by_id(session: AsyncSession, submission_id: UUID) -> ProjectSubmission | None:
    return await session.get(ProjectSubmission, submission_id)


async def refresh_submission(session: AsyncSession, submission: ProjectSubmission) -> None:
    await session.refresh(submission, with_for_update=True)
