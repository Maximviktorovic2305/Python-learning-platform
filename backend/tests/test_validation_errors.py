import httpx
import pytest


@pytest.mark.parametrize("endpoint", ["register", "login"])
async def test_validation_errors_never_return_submitted_secrets(
    client: httpx.AsyncClient, endpoint: str
) -> None:
    secret = "sensitive-password-" * 10
    payload: dict[str, object] = {"email": "invalid-email", "password": secret}
    if endpoint == "register":
        payload.update(
            username="!",
            accept_terms=False,
            accept_data_processing=False,
            legal_version="2026-10-13",
        )
    response = await client.post(f"/api/auth/{endpoint}", json=payload)
    assert response.status_code == 422
    assert secret not in response.text
    assert "invalid-email" not in response.text
    errors = response.json()["detail"]
    assert {tuple(issue["loc"]) for issue in errors} >= {
        ("body", "email"),
        ("body", "password"),
    }
    assert all(set(issue) == {"loc", "type"} for issue in errors)


async def test_password_change_validation_never_returns_passwords(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    response = await client.post(
        "/api/users/me/password",
        headers=student,
        json={"current_password": "private-current-password", "new_password": "q7X!9"},
    )
    assert response.status_code == 422
    assert "private-current-password" not in response.text
    assert "q7X!9" not in response.text
    assert response.json()["detail"][0]["loc"] == ["body", "new_password"]
