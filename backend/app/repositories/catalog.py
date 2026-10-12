from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
    topics_by_module: dict[str, list[TopicView]] = {}
    for topic in topics:
        topics_by_module.setdefault(topic.module_id, []).append(TopicView.model_validate(topic))
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
        exercise_count=await session.scalar(
            select(func.count())
            .select_from(Exercise)
            .where(Exercise.topic_id.in_([t.id for t in topics]))
        )
        or 0,
        question_count=await session.scalar(
            select(func.count())
            .select_from(Question)
            .where(Question.topic_id.in_([t.id for t in topics]))
        )
        or 0,
    )
