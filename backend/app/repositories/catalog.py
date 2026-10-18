from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.learning import QUESTION_BANK_REVISION, THEORY_ONLY_TOPICS
from app.models.tables import Course, Exercise, Level, Module, Question, Topic
from app.schemas.contracts import CourseView, LevelView, ModuleView, TopicView


async def course_catalog(session: AsyncSession, course_id: str = "python") -> CourseView | None:
    course = await session.get(Course, course_id)
    if course is None:
        return None
    levels = list(
        await session.scalars(
            select(Level).where(Level.course_id == course_id).order_by(Level.position)
        )
    )
    modules = list(
        await session.scalars(
            select(Module)
            .where(Module.level_id.in_([item.id for item in levels]))
            .order_by(Module.position)
        )
    )
    topics = list(
        await session.scalars(
            select(Topic)
            .where(Topic.module_id.in_([m.id for m in modules]))
            .order_by(Topic.position)
        )
    )
    difficulties: dict[str, dict[str, int]] = {}
    for topic_id, difficulty, count in await session.execute(
        select(Exercise.topic_id, Exercise.difficulty, func.count())
        .where(
            Exercise.topic_id.in_([topic.id for topic in topics]),
            Exercise.topic_id.not_in(THEORY_ONLY_TOPICS),
        )
        .group_by(Exercise.topic_id, Exercise.difficulty)
    ):
        if topic_id is not None:
            difficulties.setdefault(topic_id, {})[difficulty] = int(count)
    question_counts = dict(
        (
            await session.execute(
                select(Question.topic_id, func.count())
                .where(
                    Question.topic_id.in_([topic.id for topic in topics]),
                    Question.topic_id.not_in(THEORY_ONLY_TOPICS),
                    Question.id.like(Question.topic_id + f"-{QUESTION_BANK_REVISION}-%"),
                )
                .group_by(Question.topic_id)
            )
        ).all()
    )
    topics_by_module: dict[str, list[TopicView]] = {}
    for topic in topics:
        distribution = difficulties.get(topic.id, {})
        topics_by_module.setdefault(topic.module_id, []).append(
            TopicView.model_validate(topic).model_copy(
                update={
                    "exercise_count": sum(distribution.values()),
                    "question_count": int(question_counts.get(topic.id, 0)),
                    "practice_difficulties": distribution,
                }
            )
        )
    modules_by_level: dict[str, list[ModuleView]] = {}
    for module in modules:
        modules_by_level.setdefault(module.level_id, []).append(
            ModuleView(
                id=module.id,
                level_id=module.level_id,
                position=module.position,
                title=module.title,
                topics=topics_by_module.get(module.id, []),
            )
        )
    return CourseView(
        id=course.id,
        title=course.title,
        description=course.description,
        levels=[
            LevelView(
                id=item.id,
                course_id=item.course_id,
                position=item.position,
                title=item.title,
                description=item.description,
                modules=modules_by_level.get(item.id, []),
            )
            for item in levels
        ],
        published_topics=sum(t.published for t in topics),
        exercise_count=sum(sum(distribution.values()) for distribution in difficulties.values()),
        question_count=sum(int(value) for value in question_counts.values()),
    )
