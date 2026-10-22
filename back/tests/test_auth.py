from httpx import AsyncClient

from tests.conftest import ADMIN_EMAIL, login


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.json() == {"status": "ok"}


async def test_login_rejects_wrong_password(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert response.status_code == 401
    assert "rms_session" not in client.cookies


async def test_login_sets_httponly_session_and_csrf_cookies(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"email": ADMIN_EMAIL.upper(), "password": "test-admin-password"}
    )
    assert response.status_code == 200
    cookies = response.headers.get_list("set-cookie")
    session = next(c for c in cookies if c.startswith("rms_session="))
    csrf = next(c for c in cookies if c.startswith("rms_csrf="))
    assert "HttpOnly" in session
    assert "HttpOnly" not in csrf
    assert "samesite=lax" in session.lower()
    me = await client.get("/api/v1/auth/me")
    assert me.json()["user"]["email"] == ADMIN_EMAIL


async def test_admin_api_requires_session(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/admin/leads")).status_code == 401
    assert (await client.get("/api/v1/admin/dashboard")).status_code == 401


async def test_mutations_require_csrf_token(client: AsyncClient) -> None:
    await login(client)
    del client.headers["X-CSRF-Token"]
    response = await client.post("/api/v1/admin/faq", json={"question": "Q", "answer": "A"})
    assert response.status_code == 403
    client.headers["X-CSRF-Token"] = "forged"
    assert (await client.post("/api/v1/admin/faq", json={"question": "Q", "answer": "A"})).status_code == 403


async def test_logout_invalidates_session(client: AsyncClient) -> None:
    await login(client)
    session_cookie = client.cookies["rms_session"]
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    client.cookies.set("rms_session", session_cookie)
    assert (await client.get("/api/v1/auth/me")).status_code == 401


async def test_editor_role_cannot_manage_users_or_settings(admin: AsyncClient, client: AsyncClient) -> None:
    created = await admin.post(
        "/api/v1/admin/users",
        json={"email": "editor@example.com", "password": "editor-password-1", "role": "editor"},
    )
    assert created.status_code == 201
    async with AsyncClient(transport=admin._transport, base_url="http://test") as editor:
        await login(editor, "editor@example.com", "editor-password-1")
        assert (await editor.get("/api/v1/admin/users")).status_code == 403
        assert (await editor.put("/api/v1/admin/settings/site", json={"value": {}})).status_code == 403
        assert (await editor.get("/api/v1/admin/leads")).status_code == 200


async def test_login_is_rate_limited(client: AsyncClient) -> None:
    statuses = [
        (await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "x"})).status_code
        for _ in range(11)
    ]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429
