from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.errors import Conflict, ResourceNotFound
from app.models.tables import ProjectSubmission, User
from app.repositories import learning as records
from app.repositories.users import lock_user, user_by_id
from app.schemas.contracts import ProjectInput, ProjectSubmissionView, ProjectView
from app.services.progress import award


async def projects(session: AsyncSession) -> list[ProjectView]:
    return [ProjectView.model_validate(item) for item in await records.projects(session)]


async def submissions(session: AsyncSession, user: User) -> list[ProjectSubmissionView]:
    return [
        ProjectSubmissionView.model_validate(item)
        for item in await records.submissions(session, user.id)
    ]


async def submit(
    session: AsyncSession, user: User, project_id: str, payload: ProjectInput
) -> ProjectSubmissionView:
    if await records.project(session, project_id) is None:
        raise ResourceNotFound("Проект не найден")
    await lock_user(session, user)
    submission = await records.project_submission(session, user.id, project_id)
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
            raise Conflict("Проект уже принят")
        submission.repository_url, submission.notes = str(payload.repository_url), payload.notes
        submission.status = "submitted"
    await session.flush()
    return ProjectSubmissionView.model_validate(submission)


async def approve(session: AsyncSession, submission_id: UUID) -> int:
    submission = await records.submission_by_id(session, submission_id)
    if submission is None:
        raise ResourceNotFound("Работа не найдена")
    student = await user_by_id(session, submission.user_id)
    if student is None:
        raise ResourceNotFound("Пользователь не найден")
    # Match submission writers: user first, then refresh the submission under lock.
    await lock_user(session, student)
    await records.refresh_submission(session, submission)
    submission.status = "approved"
    return await award(session, student, "project", submission.project_id, None, 500)
