from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from pydantic import BaseModel
from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.learning import next_streak, percentage
from app.models.tables import (
    Achievement,
    Answer,
    Completion,
    Exercise,
    Quiz,
    QuizAttempt,
    Topic,
    User,
    UserAchievement,
)
from app.repositories.catalog import course_catalog
from app.schemas.contracts import CompletionView, ProgressView, UserView, WeakTopic


class TopicAccuracy(BaseModel):
    id: str
    title: str
    answer_count: int
    correct_count: int


async def award(
    session: AsyncSession, user: User, kind: str, resource_id: str, topic_id: str | None, xp: int
) -> int:
    # All writers take the same row lock before checking uniqueness and modifying XP/streak.
    await session.refresh(user, with_for_update=True)
    existing = await session.scalar(
        select(Completion.id).where(
            Completion.user_id == user.id,
            Completion.kind == kind,
            Completion.resource_id == resource_id,
        )
    )
    if existing is not None:
        return 0
    today = datetime.now(ZoneInfo(user.timezone)).date()
    user.total_xp += xp
    user.current_level = user.total_xp // 500
    user.streak = next_streak(user.last_activity, user.streak, today)
    user.longest_streak = max(user.longest_streak, user.streak)
    user.last_activity = today
    session.add(
        Completion(
            user_id=user.id,
            kind=kind,
            resource_id=resource_id,
            topic_id=topic_id,
            xp=xp,
            activity_date=today,
        )
    )
    await session.flush()
    await grant_achievements(session, user)
    return xp


async def grant_achievements(session: AsyncSession, user: User) -> None:
    grouped = await session.execute(
        select(Completion.kind, func.count())
        .where(Completion.user_id == user.id)
        .group_by(Completion.kind)
    )
    metrics: dict[str, int] = {str(kind): int(count) for kind, count in grouped}
    metrics["exercise"] = metrics.get("exercise", 0) + metrics.get("trainer", 0)
    metrics.update(xp=user.total_xp, streak=user.streak)
    metrics["perfect"] = (
        await session.scalar(
            select(func.count())
            .select_from(QuizAttempt)
            .where(QuizAttempt.user_id == user.id, QuizAttempt.score == 100)
        )
        or 0
    )
    earned = set(
        await session.scalars(
            select(UserAchievement.achievement_id).where(UserAchievement.user_id == user.id)
        )
    )
    for achievement in await session.scalars(select(Achievement)):
        if (
            achievement.id not in earned
            and metrics.get(achievement.metric, 0) >= achievement.threshold
        ):
            session.add(UserAchievement(user_id=user.id, achievement_id=achievement.id))


async def get_progress(session: AsyncSession, user: User) -> ProgressView:
    catalog = await course_catalog(session)
    completions = list(
        await session.scalars(
            select(Completion)
            .where(Completion.user_id == user.id)
            .order_by(Completion.created_at.desc())
        )
    )
    lesson_ids = [c.resource_id for c in completions if c.kind == "lesson"]
    exercise_ids = [c.resource_id for c in completions if c.kind == "exercise"]
    quiz_ids = [c.resource_id for c in completions if c.kind == "quiz"]
    done = {(c.kind, c.resource_id) for c in completions}
    exercises = list(await session.scalars(select(Exercise).where(Exercise.catalog == "lesson")))
    quizzes = list(await session.scalars(select(Quiz)))
    requirements: dict[str, set[tuple[str, str]]] = {}
    for e in exercises:
        if e.topic_id is not None:
            requirements.setdefault(e.topic_id, set()).add(("exercise", e.id))
    for q in quizzes:
        requirements.setdefault(q.topic_id, set()).add(("quiz", q.id))
    topics = (
        [t for level in catalog.levels for m in level.modules for t in m.topics if t.published]
        if catalog
        else []
    )
    complete_topics = [
        t.id for t in topics if {("lesson", t.id)} | requirements.get(t.id, set()) <= done
    ]
    level_percent: dict[str, int] = {}
    module_percent: dict[str, int] = {}
    if catalog:
        for level in catalog.levels:
            level_topics = [t for m in level.modules for t in m.topics if t.published]
            level_percent[level.id] = percentage(
                sum(t.id in complete_topics for t in level_topics), len(level_topics)
            )
            for module in level.modules:
                published = [t for t in module.topics if t.published]
                module_percent[module.id] = percentage(
                    sum(t.id in complete_topics for t in published), len(published)
                )
    weak_rows = await session.execute(
        select(
            Topic.id,
            Topic.title,
            func.count(Answer.id).label("answer_count"),
            func.sum(Answer.correct.cast(Integer)).label("correct_count"),
        )
        .join(Quiz, Quiz.topic_id == Topic.id)
        .join(QuizAttempt, QuizAttempt.quiz_id == Quiz.id)
        .join(Answer, Answer.attempt_id == QuizAttempt.id)
        .where(QuizAttempt.user_id == user.id)
        .group_by(Topic.id, Topic.title)
    )
    aggregates = [TopicAccuracy.model_validate(dict(row._mapping)) for row in weak_rows]
    weak = [
        WeakTopic(
            id=row.id,
            title=row.title,
            accuracy=percentage(row.correct_count, row.answer_count),
            answers=row.answer_count,
        )
        for row in aggregates
        if percentage(row.correct_count, row.answer_count) < 80
    ]
    weak.sort(key=lambda t: t.accuracy)
    today = datetime.now(ZoneInfo(user.timezone)).date()
    # Streak expires in the read model even when the user has not returned to create an activity.
    view_user = UserView.model_validate(user)
    if user.last_activity is None or user.last_activity < today - timedelta(days=1):
        view_user.streak = 0
    return ProgressView(
        user=view_user,
        lesson_ids=lesson_ids,
        exercise_ids=exercise_ids,
        trainer_exercise_ids=[c.resource_id for c in completions if c.kind == "trainer"],
        quiz_ids=quiz_ids,
        completed_topics=complete_topics,
        continue_topic=next((t.id for t in topics if t.id not in complete_topics), None),
        course_percent=percentage(len(complete_topics), len(topics)),
        level_percent=level_percent,
        module_percent=module_percent,
        daily_xp=sum(c.xp for c in completions if c.activity_date == today),
        activity=[CompletionView.model_validate(c) for c in completions[:12]],
        weak_topics=weak[:6],
        week_xp=[
            sum(c.xp for c in completions if c.activity_date == today - timedelta(days=6 - i))
            for i in range(7)
        ],
    )
