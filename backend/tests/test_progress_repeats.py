import asyncio

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.api.dependencies import get_runner
from app.main import app
from app.models.tables import Completion, Question, User
from app.ports.execution import ExecutionRequest
from app.schemas.contracts import ExecutionResult


class CheckingRunner:
    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        passed = request.code == "correct"
        return ExecutionResult(
            status="passed" if passed else "failed",
            passed=len(request.tests) if passed else 0,
            total=len(request.tests),
            stdout="",
            stderr="",
        )


async def test_repeating_all_topic_stages_preserves_xp_and_completion(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    app.dependency_overrides[get_runner] = CheckingRunner
    for round_number in range(3):
        theory = await client.post("/api/lessons/academy-introduction/complete", headers=student)
        assert theory.status_code == 200
        assert theory.json()["message"].endswith(f"+{20 if round_number == 0 else 0} XP")
        for index in range(1, 4):
            result = await client.post(
                f"/api/exercises/academy-introduction-e{index}/submit",
                headers=student,
                json={"code": "correct"},
            )
            assert result.status_code == 200, result.text
            assert result.json()["xp"] == (30 if round_number == 0 else 0)

        attempt = (
            await client.post("/api/quizzes/academy-introduction/attempts", headers=student)
        ).json()
        async with factory() as session:
            questions = await session.scalars(
                select(Question).where(
                    Question.id.in_(attempt["questions"][i]["id"] for i in range(10))
                )
            )
            answers = [{"question_id": q.id, "selected": q.correct_answer} for q in questions]
        result = await client.post(
            f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
        )
        assert result.status_code == 200, result.text
        assert result.json()["xp"] == (50 if round_number == 0 else 0)
        replay = await client.post(
            f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
        )
        assert replay.json() == result.json()  # Replayed result describes the original reward.
        failed = await client.post(
            "/api/exercises/academy-introduction-e1/submit", headers=student, json={"code": "wrong"}
        )
        assert failed.json()["xp"] == 0
        progress = (await client.get("/api/progress", headers=student)).json()
        assert progress["user"]["total_xp"] == progress["daily_xp"] == 160
        assert progress["completed_topics"] == ["academy-introduction"]
        assert len(progress["activity"]) == 5
        async with factory() as session:
            assert await session.scalar(select(func.count()).select_from(Completion)) == 5
            assert await session.scalar(select(func.sum(Completion.xp))) == 160


async def test_concurrent_exercise_and_distinct_quiz_attempts_award_once(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    engine, factory = database
    if engine.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    app.dependency_overrides[get_runner] = CheckingRunner
    attempts = [
        (await client.post("/api/quizzes/academy-introduction/attempts", headers=student)).json()
        for _ in range(3)
    ]
    async with factory() as session:
        bank = {q.id: q.correct_answer for q in await session.scalars(select(Question))}
    responses = await asyncio.gather(
        *(
            client.post(
                "/api/exercises/academy-introduction-e1/submit",
                headers=student,
                json={"code": "correct"},
            )
            for _ in range(5)
        ),
        *(
            client.post(
                f"/api/attempts/{attempt['id']}/submit",
                headers=student,
                json={
                    "answers": [
                        {"question_id": q["id"], "selected": bank[q["id"]]}
                        for q in attempt["questions"]
                    ]
                },
            )
            for attempt in attempts
        ),
    )
    assert all(response.status_code == 200 for response in responses)
    assert sorted(response.json()["xp"] for response in responses[:5]) == [0, 0, 0, 0, 30]
    assert sorted(response.json()["xp"] for response in responses[5:]) == [0, 0, 50]
    async with factory() as session:
        user = await session.scalar(select(User).where(User.username == "student"))
        assert user is not None and user.total_xp == 80
        assert await session.scalar(select(func.sum(Completion.xp))) == 80
        assert await session.scalar(select(func.count()).select_from(Completion)) == 2
