from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import Session
from app.schemas.contracts import (
    CourseView,
    LevelView,
    ModuleView,
    QuestionView,
    TopicView,
)
from app.services import catalog as catalog_service

router = APIRouter(prefix="/api")


@router.get("/questions", response_model=list[QuestionView], tags=["questions"])
async def questions(
    topic_id: str,
    session: Session,
    limit: Annotated[int, Query(ge=1, le=100)] = 32,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[QuestionView]:
    return await catalog_service.questions(session, topic_id, limit, offset)


@router.get("/courses", response_model=list[CourseView], tags=["catalog"])
async def courses(session: Session) -> list[CourseView]:
    return await catalog_service.courses(session)


@router.get("/courses/{course_id}", response_model=CourseView, tags=["catalog"])
async def course(course_id: str, session: Session) -> CourseView:
    return await catalog_service.get_course(session, course_id)


@router.get("/levels/{level_id}", response_model=LevelView, tags=["catalog"])
async def level(level_id: str, session: Session) -> LevelView:
    return await catalog_service.get_level(session, level_id)


@router.get("/modules/{module_id}", response_model=ModuleView, tags=["catalog"])
async def module(module_id: str, session: Session) -> ModuleView:
    return await catalog_service.get_module(session, module_id)


@router.get("/topics/{topic_id}", response_model=TopicView, tags=["catalog"])
async def topic(topic_id: str, session: Session) -> TopicView:
    return await catalog_service.get_topic(session, topic_id)
