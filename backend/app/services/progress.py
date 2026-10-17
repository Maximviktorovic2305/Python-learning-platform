from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.learning import next_streak, percentage
from app.models.tables import (
    Completion,
    User,
    UserAchievement,
)
from app.repositories import progress as records
from app.repositories.catalog import course_catalog
from app.repositories.users import lock_user
from app.schemas.contracts import AchievementView, CompletionView, ProgressView, UserView, WeakTopic


async def award(
    session: AsyncSession, user: User, kind: str, resource_id: str, topic_id: str | None, xp: int
) -> int:
    # All writers take the same row lock before checking uniqueness and modifying XP/streak.
    await lock_user(session, user)
    if await records.completion_exists(session, user.id, kind, resource_id):
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
    metrics = await records.achievement_metrics(session, user.id)
    metrics["exercise"] = metrics.get("exercise", 0) + metrics.get("trainer", 0)
    metrics.update(xp=user.total_xp, streak=user.streak)
    earned = {item.achievement_id for item in await records.earned_achievements(session, user.id)}
    for achievement in await records.achievements(session):
        if (
            achievement.id not in earned
            and metrics.get(achievement.metric, 0) >= achievement.threshold
        ):
            session.add(UserAchievement(user_id=user.id, achievement_id=achievement.id))


async def get_progress(session: AsyncSession, user: User) -> ProgressView:
    catalog = await course_catalog(session)
    completions = await records.completions(session, user.id)
    lesson_ids = [c.resource_id for c in completions if c.kind == "lesson"]
    exercise_ids = [c.resource_id for c in completions if c.kind == "exercise"]
    quiz_ids = [c.resource_id for c in completions if c.kind == "quiz"]
    done = {(c.kind, c.resource_id) for c in completions}
    exercises = await records.course_exercises(session)
    quizzes = await records.quizzes(session)
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
    aggregates = await records.topic_accuracy(session, user.id)
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


async def list_achievements(session: AsyncSession, user: User) -> list[AchievementView]:
    earned = {
        item.achievement_id: item.earned_at
        for item in await records.earned_achievements(session, user.id)
    }
    return [
        AchievementView(
            id=item.id,
            title=item.title,
            description=item.description,
            threshold=item.threshold,
            earned_at=earned.get(item.id),
        )
        for item in await records.achievements(session)
    ]
