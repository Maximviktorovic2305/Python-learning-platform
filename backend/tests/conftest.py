import os
from collections.abc import AsyncIterator

import httpx
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.database import get_session
from app.main import app, requests_by_ip
from app.models import Base
from app.seed import seed
from app.services.execution import DisabledRunner, get_runner


@pytest.fixture
async def database() -> AsyncIterator[tuple[AsyncEngine, async_sessionmaker[AsyncSession]]]:
    url = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    if not url.startswith("sqlite") and not url.endswith("/python_lab_test"):
        raise RuntimeError("Tests require a dedicated database named python_lab_test")
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory.begin() as session:
        await seed(session)
    yield engine, factory
    await engine.dispose()


@pytest.fixture
async def client(
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> AsyncIterator[httpx.AsyncClient]:
    _, factory = database

    async def test_session() -> AsyncIterator[AsyncSession]:
        async with factory.begin() as session:
            yield session

    app.dependency_overrides[get_session] = test_session
    app.dependency_overrides[get_runner] = DisabledRunner
    requests_by_ip.clear()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://localhost:3010",
        headers={"Origin": "http://localhost:3010"},
    ) as http_client:
        yield http_client
    app.dependency_overrides.clear()


@pytest.fixture
async def student(client: httpx.AsyncClient) -> dict[str, str]:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "student@example.com",
            "username": "student",
            "password": "test-password-1234",
        },
    )
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
