import asyncio

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.models.tables import Completion, Question, User
from app.seed import seed


async def test_catalog_and_idempotent_seed(
    client: httpx.AsyncClient, database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]]
) -> None:
    _, factory = database
    async with factory.begin() as session:
        await seed(session)
    response = await client.get("/api/courses/python")
    assert response.status_code == 200
    course = response.json()
    assert len(course["levels"]) == 12
    assert course["published_topics"] == 15
    assert course["exercise_count"] == 120
    assert course["question_count"] == 480
    assert (await client.get("/api/lessons/classes")).status_code == 404
    assert (await client.get("/api/lessons/first-program")).status_code == 200


async def test_auth_refresh_rotation_logout_and_revocation(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    old_refresh = client.cookies.get("refresh")
    assert (await client.get("/api/users/me", headers=student)).status_code == 200
    response = await client.post("/api/auth/refresh")
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert client.cookies.get("refresh") != old_refresh
    replay = await client.post("/api/auth/refresh", headers={"Cookie": f"refresh={old_refresh}"})
    assert replay.status_code == 401
    assert (await client.post("/api/auth/logout")).status_code == 200
    assert (
        await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    ).status_code == 401


async def test_wrong_credentials_and_origin_are_rejected(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    assert (
        await client.post(
            "/api/auth/login", json={"email": "student@example.com", "password": "wrong"}
        )
    ).status_code == 401
    assert (
        await client.post("/api/auth/refresh", headers={"Origin": "https://evil.example"})
    ).status_code == 403
    assert (await client.get("/api/progress")).status_code == 401
    duplicate = await client.post(
        "/api/auth/register",
        json={
            "email": "student@example.com",
            "username": "different",
            "password": "test-password-1234",
        },
    )
    assert duplicate.status_code == 409


async def test_lesson_completion_is_idempotent(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    for _ in range(2):
        assert (
            await client.post("/api/lessons/first-program/complete", headers=student)
        ).status_code == 200
    data = (await client.get("/api/progress", headers=student)).json()
    assert data["user"]["total_xp"] == 20
    assert data["daily_xp"] == 20
    assert data["user"]["streak"] == 1
    assert data["lesson_ids"] == ["first-program"]
    assert data["course_percent"] == 0  # Topic also requires exercises and a passed quiz.
    achievements = (await client.get("/api/achievements", headers=student)).json()
    assert next(a for a in achievements if a["id"] == "first-lesson")["earned_at"]


async def test_quiz_hides_answers_and_grades_server_side(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    attempt = (await client.post("/api/quizzes/first-program/attempts", headers=student)).json()
    assert len(attempt["questions"]) == 10
    assert all("correct_answer" not in q and "explanation" not in q for q in attempt["questions"])
    async with factory() as session:
        questions = list(
            await session.scalars(
                select(Question).where(Question.id.in_([q["id"] for q in attempt["questions"]]))
            )
        )
        answers = [{"question_id": q.id, "selected": q.correct_answer} for q in questions]
    result = await client.post(
        f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
    )
    assert result.status_code == 200, result.text
    assert result.json()["score"] == 100
    assert result.json()["xp"] == 50
    assert len(result.json()["review"]) == 10
    again = await client.post(
        f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
    )
    assert again.json() == result.json()
    assert (await client.get("/api/progress", headers=student)).json()["user"]["total_xp"] == 50
    other = await client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "username": "other", "password": "test-password-5678"},
    )
    assert (
        await client.get(
            f"/api/attempts/{attempt['id']}",
            headers={"Authorization": f"Bearer {other.json()['access_token']}"},
        )
    ).status_code == 404


async def test_incomplete_quiz_invalid_options_and_weak_topics(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    attempt = (await client.post("/api/quizzes/variables-types/attempts", headers=student)).json()
    assert (
        await client.post(
            f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": []}
        )
    ).status_code == 422
    answers = [{"question_id": q["id"], "selected": [99]} for q in attempt["questions"]]
    assert (
        await client.post(
            f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
        )
    ).status_code == 422
    async with factory() as session:
        bank = {
            q.id: q
            for q in await session.scalars(
                select(Question).where(Question.topic_id == "variables-types")
            )
        }
    answers = [
        {
            "question_id": q["id"],
            "selected": [
                next(i for i in range(len(q["options"])) if [i] != bank[q["id"]].correct_answer)
            ],
        }
        for q in attempt["questions"]
    ]
    result = await client.post(
        f"/api/attempts/{attempt['id']}/submit", headers=student, json={"answers": answers}
    )
    assert result.status_code == 200
    assert result.json()["score"] == 0
    data = (await client.get("/api/progress", headers=student)).json()
    assert data["weak_topics"][0]["id"] == "variables-types"
    assert data["weak_topics"][0]["accuracy"] == 0
    assert data["user"]["total_xp"] == 0


async def test_runner_disabled_does_not_execute_code_or_award_xp(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    result = await client.post(
        "/api/exercises/first-program-e1/submit",
        headers=student,
        json={"code": "print('Hello, Python!')"},
    )
    assert result.status_code == 503
    assert (await client.get("/api/progress", headers=student)).json()["user"]["total_xp"] == 0


async def test_profile_validation_password_revokes_sessions(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    invalid = await client.patch(
        "/api/users/me",
        headers=student,
        json={"username": "student", "daily_goal": 0, "timezone": "Invalid/Zone"},
    )
    assert invalid.status_code == 422
    assert (
        await client.patch(
            "/api/users/me",
            headers=student,
            json={"username": "renamed", "daily_goal": 120, "timezone": "UTC"},
        )
    ).status_code == 200
    assert (
        await client.post(
            "/api/users/me/password",
            headers=student,
            json={
                "current_password": "test-password-1234",
                "new_password": "new-test-password-1234",
            },
        )
    ).status_code == 200
    assert (await client.get("/api/users/me", headers=student)).status_code == 401
    assert (
        await client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "new-test-password-1234"},
        )
    ).status_code == 200


async def test_projects_require_review_and_admin(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    result = await client.post(
        "/api/projects/01-cli/submissions",
        headers=student,
        json={
            "repository_url": "https://example.com/repo",
            "notes": "Работающий CLI менеджер задач, запуск: python -m tasks",
        },
    )
    assert result.status_code == 200
    assert result.json()["status"] == "submitted"
    assert (
        await client.post(
            f"/api/projects/submissions/{result.json()['id']}/approve", headers=student
        )
    ).status_code == 403
    assert (await client.get("/api/progress", headers=student)).json()["user"]["total_xp"] == 0


async def test_concurrent_completion_uses_postgres_lock(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    engine, factory = database
    if engine.dialect.name != "postgresql":
        pytest.skip("Row-lock concurrency requires PostgreSQL")
    responses = await asyncio.gather(
        *(client.post("/api/lessons/first-program/complete", headers=student) for _ in range(5))
    )
    assert all(r.status_code == 200 for r in responses)
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(Completion)) == 1
        user = await session.scalar(select(User).where(User.username == "student"))
        assert user is not None and user.total_xp == 20
