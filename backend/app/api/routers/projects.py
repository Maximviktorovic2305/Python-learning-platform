from uuid import UUID

from fastapi import APIRouter

from app.api.dependencies import AdminUser, CurrentUser, Session
from app.schemas.contracts import (
    Message,
    ProjectInput,
    ProjectSubmissionView,
    ProjectView,
)
from app.services import projects as project_service

router = APIRouter(prefix="/api")


@router.get("/projects", response_model=list[ProjectView], tags=["projects"])
async def projects(session: Session) -> list[ProjectView]:
    return await project_service.projects(session)


@router.get("/projects/submissions", response_model=list[ProjectSubmissionView], tags=["projects"])
async def project_submissions(user: CurrentUser, session: Session) -> list[ProjectSubmissionView]:
    return await project_service.submissions(session, user)


@router.post(
    "/projects/{project_id}/submissions", response_model=ProjectSubmissionView, tags=["projects"]
)
async def submit_project(
    project_id: str, payload: ProjectInput, user: CurrentUser, session: Session
) -> ProjectSubmissionView:
    return await project_service.submit(session, user, project_id, payload)


@router.post(
    "/projects/submissions/{submission_id}/approve", response_model=Message, tags=["admin"]
)
async def approve_project(submission_id: UUID, admin: AdminUser, session: Session) -> Message:
    xp = await project_service.approve(session, submission_id)
    return Message(message=f"Проект принят. +{xp} XP")
