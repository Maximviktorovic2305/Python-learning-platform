from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import ResourceNotFound
from app.repositories import learning as records
from app.repositories.catalog import course_catalog
from app.schemas.contracts import (
    CodeExample,
    CourseView,
    LessonView,
    LevelView,
    ModuleView,
    QuestionView,
    TheorySection,
    TopicView,
)


async def get_course(session: AsyncSession, course_id: str = "python") -> CourseView:
    result = await course_catalog(session, course_id)
    if result is None:
        raise ResourceNotFound("Курс не найден")
    return result


async def courses(session: AsyncSession) -> list[CourseView]:
    result = await course_catalog(session)
    return [result] if result else []


async def get_level(session: AsyncSession, level_id: str) -> LevelView:
    result = next(
        (level for level in (await get_course(session)).levels if level.id == level_id), None
    )
    if result is None:
        raise ResourceNotFound("Уровень не найден")
    return result


async def get_module(session: AsyncSession, module_id: str) -> ModuleView:
    result = next(
        (
            module
            for level in (await get_course(session)).levels
            for module in level.modules
            if module.id == module_id
        ),
        None,
    )
    if result is None:
        raise ResourceNotFound("Модуль не найден")
    return result


async def get_topic(session: AsyncSession, topic_id: str) -> TopicView:
    item = await records.topic(session, topic_id)
    if item is None:
        raise ResourceNotFound("Тема не найдена")
    distribution, question_count = await records.topic_counts(session, topic_id)
    return TopicView.model_validate(item).model_copy(
        update={
            "exercise_count": sum(distribution.values()),
            "question_count": question_count,
            "practice_difficulties": distribution,
        }
    )


async def get_lesson(session: AsyncSession, topic_id: str) -> LessonView:
    topic = await get_topic(session, topic_id)
    item = await records.lesson(session, topic_id)
    if not topic.published or item is None:
        raise ResourceNotFound("Урок ещё не опубликован")
    return LessonView(
        id=item.id,
        topic=topic,
        theory=[TheorySection.model_validate(s) for s in item.theory],
        examples=[CodeExample.model_validate(e) for e in item.examples],
        review=item.review,
        exercise_count=topic.exercise_count,
        question_count=topic.question_count,
    )


async def questions(
    session: AsyncSession, topic_id: str, limit: int, offset: int
) -> list[QuestionView]:
    topic = await records.topic(session, topic_id)
    if topic is None or not topic.published:
        raise ResourceNotFound("Опубликованная тема не найдена")
    return [
        QuestionView.model_validate(q)
        for q in await records.questions(session, topic_id, limit=limit, offset=offset)
    ]
