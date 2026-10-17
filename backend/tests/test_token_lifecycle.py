from datetime import UTC, datetime, timedelta

import httpx
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.security import decode_access
from app.models.tables import AuthSession, UsedRefreshToken, User


async def test_expired_access_and_refresh_are_rejected(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    original = student["Authorization"].removeprefix("Bearer ")
    claims = jwt.decode(
        original, get_settings().jwt_secret, algorithms=["HS256"], audience="python-lab-web"
    )
    claims["exp"] = int((datetime.now(UTC) - timedelta(seconds=1)).timestamp())
    expired = jwt.encode(claims, get_settings().jwt_secret, algorithm="HS256")
    assert (
        await client.get("/api/users/me", headers={"Authorization": f"Bearer {expired}"})
    ).status_code == 401
    _, session_id = decode_access(original)
    _, factory = database
    async with factory.begin() as session:
        auth_session = await session.get(AuthSession, session_id)
        assert auth_session is not None
        auth_session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    assert (await client.post("/api/auth/refresh")).status_code == 401
    assert (await client.get("/api/users/me", headers=student)).status_code == 401
    assert client.cookies.get("refresh") is None


async def test_password_change_revokes_all_sessions_and_refresh_tokens(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    first_cookie = client.cookies.get("refresh")
    login = await client.post(
        "/api/auth/login", json={"email": "student@example.com", "password": "test-password-1234"}
    )
    assert login.status_code == 200
    second = {"Authorization": f"Bearer {login.json()['access_token']}"}
    second_cookie = client.cookies.get("refresh")
    response = await client.post(
        "/api/users/me/password",
        headers=student,
        json={
            "current_password": "test-password-1234",
            "new_password": "changed-password-1234",
        },
    )
    assert response.status_code == 200
    for headers in [student, second]:
        assert (await client.get("/api/users/me", headers=headers)).status_code == 401
    for cookie in [first_cookie, second_cookie]:
        assert (
            await client.post("/api/auth/refresh", headers={"Cookie": f"refresh={cookie}"})
        ).status_code == 401
    _, factory = database
    async with factory() as session:
        sessions = list(await session.scalars(select(AuthSession)))
        assert len(sessions) == 2 and all(item.revoked for item in sessions)
    assert (
        await client.post(
            "/api/auth/login",
            json={"email": "student@example.com", "password": "changed-password-1234"},
        )
    ).status_code == 200


async def test_updating_profile_preserves_active_session_and_rejected_update_rolls_back(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    profile = {"username": "updated_student", "daily_goal": 150, "timezone": "UTC"}
    assert (await client.patch("/api/users/me", headers=student, json=profile)).status_code == 200
    assert (
        await client.patch("/api/users/me", headers=student, json={**profile, "daily_goal": 0})
    ).status_code == 422
    actual = (await client.get("/api/users/me", headers=student)).json()
    assert all(actual[key] == value for key, value in profile.items())
    assert (await client.post("/api/auth/refresh")).status_code == 200
    # Account/project deletion is not an implemented API operation.
    assert (await client.delete("/api/users/me", headers=student)).status_code == 405
    assert (
        await client.delete("/api/projects/academy-task-manager/submissions", headers=student)
    ).status_code == 405
    assert (await client.get("/api/users/me", headers=student)).status_code == 200


async def test_random_refresh_token_cannot_revoke_an_unrelated_session(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    valid_cookie = client.cookies.get("refresh")
    assert (
        await client.post("/api/auth/refresh", headers={"Cookie": "refresh=unknown-token"})
    ).status_code == 401
    assert (await client.get("/api/users/me", headers=student)).status_code == 200
    assert (
        await client.post("/api/auth/refresh", headers={"Cookie": f"refresh={valid_cookie}"})
    ).status_code == 200


async def test_wrong_password_change_preserves_every_active_session(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    second = await client.post(
        "/api/auth/login", json={"email": "student@example.com", "password": "test-password-1234"}
    )
    assert second.status_code == 200
    response = await client.post(
        "/api/users/me/password",
        headers=student,
        json={"current_password": "wrong-password", "new_password": "changed-password-1234"},
    )
    assert response.status_code == 400
    for headers in [student, {"Authorization": f"Bearer {second.json()['access_token']}"}]:
        assert (await client.get("/api/users/me", headers=headers)).status_code == 200
    assert (await client.post("/api/auth/refresh")).status_code == 200


async def test_deleted_user_and_sessions_cannot_authenticate(
    client: httpx.AsyncClient,
    student: dict[str, str],
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    # Maintenance deletion is distinct from a public DELETE account endpoint.
    rotated = await client.post("/api/auth/refresh")
    assert rotated.status_code == 200
    _, factory = database
    async with factory.begin() as session:
        user = await session.scalar(select(User).where(User.username == "student"))
        assert user is not None
        await session.delete(user)
    assert (await client.get("/api/users/me", headers=student)).status_code == 401
    assert (await client.post("/api/auth/refresh")).status_code == 401
    assert client.cookies.get("refresh") is None
    async with factory() as session:
        assert await session.scalar(select(AuthSession)) is None
        assert await session.scalar(select(UsedRefreshToken)) is None
