import asyncio

import pytest
from sqlalchemy import func, select

from app.api.dependencies import get_runner
from app.main import app
from app.models.tables import (
    Answer,
    Completion,
    ProjectSubmission,
    QuestionMemory,
    QuizAttempt,
    Topic,
    User,
)
from app.schemas.contracts import ExecutionResult


@pytest.mark.parametrize("status", ["failed", "passed"])
async def test_execution_adapter_cannot_supply_rewards(client, student, status):
    class UntrustedRewardRunner:
        async def execute(self, request):
            return ExecutionResult(
                status=status,
                stdout="",
                stderr="",
                total=len(request.tests),
                passed=len(request.tests) if status == "passed" else 0,
                xp=999999,
            )

    app.dependency_overrides[get_runner] = UntrustedRewardRunner
    for expected in [30, 0] if status == "passed" else [0, 0]:
        response = await client.post(
            "/api/exercises/trainer-01/submit", headers=student, json={"code": "test adapter"}
        )
        assert response.status_code == 200
        assert response.json()["xp"] == expected
    assert (await client.get("/api/progress", headers=student)).json()["user"]["total_xp"] == (
        30 if status == "passed" else 0
    )


async def test_unpublished_course_content_cannot_be_executed_or_rewarded(client, student, database):
    _, factory = database
    async with factory.begin() as session:
        topic = await session.get(Topic, "academy-introduction")
        topic.published = False

    class NeverCalled:
        async def execute(self, request):
            pytest.fail("An unpublished exercise reached the runner")

    app.dependency_overrides[get_runner] = NeverCalled
    assert (await client.get("/api/exercises?topic_id=academy-introduction")).status_code == 404
    assert (
        await client.post(
            "/api/exercises/academy-introduction-e1/submit",
            headers=student,
            json={"code": "print(1)"},
        )
    ).status_code == 404
    assert (
        await client.post("/api/lessons/academy-introduction/complete", headers=student)
    ).status_code == 404
    assert (await client.get("/api/progress", headers=student)).json()["user"]["total_xp"] == 0


async def test_domain_error_rolls_back_partial_answer_writes(client, student, database):
    _, factory = database
    attempt = (
        await client.post("/api/quizzes/academy-introduction/attempts", headers=student)
    ).json()
    answers = [
        {"question_id": question["id"], "selected": [0]} for question in attempt["questions"]
    ]
    answers[-1]["selected"] = [9999]
    response = await client.post(
        f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
    )
    assert response.status_code == 422
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(Answer)) == 0
        assert await session.scalar(select(func.count()).select_from(QuestionMemory)) == 0
        assert await session.scalar(select(func.count()).select_from(Completion)) == 0
        current = await session.scalar(select(QuizAttempt))
        assert current.finished_at is None
    # The rejected submission did not corrupt the attempt: it can still be finished.
    answers[-1]["selected"] = [0]
    assert (
        await client.post(
            f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
        )
    ).status_code == 200


async def test_concurrent_project_approval_and_resubmission_are_serialized(
    client, student, database
):
    engine, factory = database
    if engine.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    async with factory.begin() as session:
        user = await session.scalar(select(User).where(User.username == "student"))
        user.role = "admin"
    project = (await client.get("/api/projects")).json()[0]
    path = f"/api/projects/{project['id']}/submissions"
    payload = {
        "repository_url": "https://github.com/example/python-project",
        "notes": "Проект готов к проверке. Реализованы все требования и автоматические тесты.",
    }
    submission = await client.post(path, headers=student, json=payload)
    assert submission.status_code == 200
    approve = f"/api/projects/submissions/{submission.json()['id']}/approve"
    responses = await asyncio.gather(
        *(client.post(approve, headers=student) for _ in range(3)),
        *(client.post(path, headers=student, json=payload) for _ in range(3)),
    )
    assert all(response.status_code == 200 for response in responses[:3])
    assert all(response.status_code in {200, 409} for response in responses[3:])
    async with factory() as session:
        assert (await session.scalar(select(ProjectSubmission))).status == "approved"
        assert await session.scalar(select(func.count()).select_from(Completion)) == 1
        assert await session.scalar(select(func.sum(Completion.xp))) == 500
        assert (await session.scalar(select(User))).total_xp == 500
