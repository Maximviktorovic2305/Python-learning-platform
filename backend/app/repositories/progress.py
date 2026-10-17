from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import Integer, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import (
    Achievement,
    Answer,
    Completion,
    Exercise,
    Quiz,
    QuizAttempt,
    Topic,
    UserAchievement,
)


@dataclass(frozen=True)
class TopicAccuracy:
    id: str
    title: str
    answer_count: int
    correct_count: int


async def ready(session: AsyncSession) -> None:
    await session.execute(text("SELECT 1"))


async def completion_exists(
    session: AsyncSession, user_id: UUID, kind: str, resource_id: str
) -> bool:
    return (
        await session.scalar(
            select(Completion.id).where(
                Completion.user_id == user_id,
                Completion.kind == kind,
                Completion.resource_id == resource_id,
            )
        )
        is not None
    )


async def achievement_metrics(session: AsyncSession, user_id: UUID) -> dict[str, int]:
    grouped = await session.execute(
        select(Completion.kind, func.count())
        .where(Completion.user_id == user_id)
        .group_by(Completion.kind)
    )
    result = {str(kind): int(count) for kind, count in grouped}
    result["perfect"] = (
        await session.scalar(
            select(func.count())
            .select_from(QuizAttempt)
            .where(QuizAttempt.user_id == user_id, QuizAttempt.score == 100)
        )
        or 0
    )
    return result


async def earned_achievements(session: AsyncSession, user_id: UUID) -> list[UserAchievement]:
    return list(
        await session.scalars(select(UserAchievement).where(UserAchievement.user_id == user_id))
    )


async def achievements(session: AsyncSession) -> list[Achievement]:
    return list(await session.scalars(select(Achievement).order_by(Achievement.threshold)))


async def completions(session: AsyncSession, user_id: UUID) -> list[Completion]:
    return list(
        await session.scalars(
            select(Completion)
            .where(Completion.user_id == user_id)
            .order_by(Completion.created_at.desc())
        )
    )


async def course_exercises(session: AsyncSession) -> list[Exercise]:
    return list(await session.scalars(select(Exercise).where(Exercise.catalog == "lesson")))


async def quizzes(session: AsyncSession) -> list[Quiz]:
    return list(await session.scalars(select(Quiz)))


async def topic_accuracy(session: AsyncSession, user_id: UUID) -> list[TopicAccuracy]:
    rows = await session.execute(
        select(Topic.id, Topic.title, func.count(Answer.id), func.sum(Answer.correct.cast(Integer)))
        .join(Quiz, Quiz.topic_id == Topic.id)
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .join(Answer, Answer.attempt_id == QuizAttempt.id)
        .where(QuizAttempt.user_id == user_id)
        .group_by(Topic.id, Topic.title)
    )
    return [TopicAccuracy(row[0], row[1], int(row[2]), int(row[3] or 0)) for row in rows]
