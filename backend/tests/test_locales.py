import httpx

LOCALES = ("ru", "en", "zh-CN", "es", "pt-BR", "fr", "de", "ja", "hi", "ar")


async def test_locale_is_private_persisted_and_independent_of_profile(
    client: httpx.AsyncClient, student: dict[str, str]
) -> None:
    assert (await client.patch("/api/users/me/locale", json={"locale": "en"})).status_code == 401
    before = (await client.get("/api/users/me", headers=student)).json()
    assert before["locale"] == "ru"
    for locale in LOCALES:
        response = await client.patch(
            "/api/users/me/locale", headers=student, json={"locale": locale}
        )
        assert response.status_code == 200
        after = response.json()
        assert after["locale"] == locale
        assert {key: value for key, value in after.items() if key != "locale"} == {
            key: value for key, value in before.items() if key != "locale"
        }
    for value in ("zh", "en-GB", "", "<script>", None, 1):
        response = await client.patch(
            "/api/users/me/locale", headers=student, json={"locale": value}
        )
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "locale"]
    legacy = await client.patch(
        "/api/users/me",
        headers=student,
        json={"username": before["username"], "daily_goal": 200, "timezone": "UTC"},
    )
    assert legacy.status_code == 200
    assert legacy.json()["locale"] == "ar"
    refreshed = await client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["user"]["locale"] == "ar"
    logged_in = await client.post(
        "/api/auth/login",
        json={"email": "student@example.com", "password": "test-password-1234"},
    )
    assert logged_in.status_code == 200
    assert logged_in.json()["user"]["locale"] == "ar"


async def test_registration_uses_selected_language(client: httpx.AsyncClient) -> None:
    body = {
        "email": "localized@example.com",
        "username": "localized",
        "password": "test-password-1234",
        "accept_terms": True,
        "accept_data_processing": True,
        "legal_version": "2026-10-13",
        "locale": "zh-CN",
    }
    response = await client.post("/api/auth/register", json=body)
    assert response.status_code == 201
    assert response.json()["user"]["locale"] == "zh-CN"
    response = await client.post("/api/auth/register", json={**body, "locale": "unsupported"})
    assert response.status_code == 422
