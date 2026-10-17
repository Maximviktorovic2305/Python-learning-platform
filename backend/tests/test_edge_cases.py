import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.models.tables import User


@pytest.mark.parametrize("timezone", ["", "/etc/passwd", "../UTC", "./UTC"])
async def test_invalid_timezone_is_a_validation_error(
    client: httpx.AsyncClient, student: dict[str, str], timezone: str
) -> None:
    response = await client.patch(
        "/api/users/me",
        headers=student,
        json={"username": "student", "daily_goal": 100, "timezone": timezone},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == [{"loc": ["body", "timezone"], "type": "value_error"}]
    assert (await client.get("/api/users/me", headers=student)).json()[
        "timezone"
    ] == "Asia/Vladivostok"


async def test_project_rejects_an_empty_description(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    response = await client.post(
        "/api/projects/academy-task-manager/submissions",
        headers=student,
        json={"repository_url": "https://example.com/repo", "notes": " " * 25},
    )
    assert response.status_code == 422
    assert (await client.get("/api/projects/submissions", headers=student)).json() == []


async def test_admin_approval_awards_project_xp_once_and_locks_edits(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    _, factory = database
    payload = {
        "repository_url": "https://example.com/repo",
        "notes": "CLI project, run python main.py.",
    }
    response = await client.post(
        "/api/projects/academy-task-manager/submissions", headers=student, json=payload
    )
    assert response.status_code == 200
    submission = response.json()
    admin = await client.post(
        "/api/auth/register",
        json={
            "email": "admin@example.com",
            "username": "test_admin",
            "password": "test-admin-password-1234",
            "accept_terms": True,
            "accept_data_processing": True,
            "legal_version": "2026-10-13",
        },
    )
    assert admin.status_code == 201
    async with factory.begin() as session:
        administrator = await session.scalar(select(User).where(User.username == "test_admin"))
        assert administrator is not None
        administrator.role = "admin"
    headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}
    approval = f"/api/projects/submissions/{submission['id']}/approve"
    for xp in [500, 0]:
        result = await client.post(approval, headers=headers)
        assert result.status_code == 200
        assert result.json()["message"] == f"Проект принят. +{xp} XP"
    assert (await client.get("/api/users/me", headers=student)).json()["total_xp"] == 500
    stored = (await client.get("/api/projects/submissions", headers=student)).json()
    assert len(stored) == 1 and stored[0]["status"] == "approved"
    assert (
        await client.post(
            "/api/projects/academy-task-manager/submissions", headers=student, json=payload
        )
    ).status_code == 409
