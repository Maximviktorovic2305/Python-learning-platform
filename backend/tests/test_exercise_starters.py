import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.models.tables import Exercise


async def test_api_hides_completed_starters_from_existing_database(
    client: httpx.AsyncClient, database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]]
) -> None:
    _, factory = database
    async with factory.begin() as session:
        exercise = await session.scalar(
            select(Exercise).where(Exercise.id == "academy-introduction-e2")
        )
        assert exercise is not None
        exercise.kind = "refactoring"
        exercise.starter_code = exercise.solution
        solution = exercise.solution
    response = await client.get("/api/exercises?topic_id=academy-introduction")
    assert response.status_code == 200
    exercises = response.json()
    assert len(exercises) == 3
    legacy = next(item for item in exercises if item["id"] == "academy-introduction-e2")
    assert solution not in legacy["starter_code"]
    assert legacy["kind"] == "code_writing"
    assert all("solution" not in item for item in exercises)


async def test_all_seeded_starters_are_incomplete(
    client: httpx.AsyncClient, database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]]
) -> None:
    _, factory = database
    async with factory() as session:
        exercises = list(await session.scalars(select(Exercise)))
        assert len(exercises) == 172
        assert sum(exercise.catalog == "lesson" for exercise in exercises) == 148
        assert all(
            exercise.starter_code.strip() != exercise.solution.strip() for exercise in exercises
        )
        assert all(exercise.kind != "refactoring" for exercise in exercises)
