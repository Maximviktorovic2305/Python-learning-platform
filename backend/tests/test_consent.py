from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.models.tables import User


@pytest.mark.parametrize("field", ["accept_terms", "accept_data_processing"])
@pytest.mark.parametrize("value", [None, False, 1, "true", "false"])
async def test_registration_rejects_missing_or_coerced_consent(
    client: httpx.AsyncClient,
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
    field: str,
    value: object,
) -> None:
    payload = {
        "email": "consent@example.com",
        "username": "consent_user",
        "password": "test-password-1234",
        "accept_terms": True,
        "accept_data_processing": True,
        "legal_version": "2026-10-13",
        field: value,
    }
    if value is None:
        del payload[field]
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
    _, factory = database
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 0


async def test_registration_records_acceptance_without_disclosing_it(
    client: httpx.AsyncClient,
    database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
) -> None:
    before = datetime.now(UTC)
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "consent@example.com",
            "username": "consent_user",
            "password": "test-password-1234",
            "accept_terms": True,
            "accept_data_processing": True,
            "legal_version": "2026-10-13",
        },
    )
    assert response.status_code == 201
    assert "legal_accepted_at" not in response.json()["user"]
    _, factory = database
    async with factory() as session:
        user = await session.scalar(select(User).where(User.email == "consent@example.com"))
        assert user is not None
        assert user.terms_version == user.data_consent_version == "2026-10-13"
        assert user.legal_accepted_at is not None
        assert before <= user.legal_accepted_at.replace(tzinfo=UTC) <= datetime.now(UTC)


async def test_registration_rejects_stale_documents(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "consent@example.com",
            "username": "consent_user",
            "password": "test-password-1234",
            "accept_terms": True,
            "accept_data_processing": True,
            "legal_version": "2020-01-01",
        },
    )
    assert response.status_code == 422
