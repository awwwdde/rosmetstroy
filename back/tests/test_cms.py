import io

from httpx import AsyncClient
from PIL import Image


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (40, 30), (16, 61, 112)).save(buffer, format="PNG")
    return buffer.getvalue()


async def upload_image(admin: AsyncClient) -> dict:
    response = await admin.post("/api/v1/admin/media", files={"file": ("кадр.png", png_bytes(), "image/png")})
    assert response.status_code == 201, response.text
    return response.json()


async def test_media_upload_validates_content(admin: AsyncClient) -> None:
    media = await upload_image(admin)
    assert media["width"] == 40
    assert media["height"] == 30
    assert media["url"].startswith("/media/uploads/")
    rejected = await admin.post("/api/v1/admin/media", files={"file": ("x.png", b"<?php echo 1; ?>", "image/png")})
    assert rejected.status_code == 422
    served = await admin.get(media["url"])
    assert served.status_code == 200


async def test_service_crud_and_publication(admin: AsyncClient, client: AsyncClient) -> None:
    media = await upload_image(admin)
    payload = {
        "slug": "test-usluga",
        "title": "Тестовая услуга",
        "summary": "Описание",
        "specs": [{"k": "Сварка", "v": "MIG/MAG"}],
        "stages": [{"title": "Заявка", "description": ""}],
        "cover_id": media["id"],
        "is_published": True,
    }
    created = await admin.post("/api/v1/admin/services", json=payload)
    assert created.status_code == 201, created.text
    service_id = created.json()["id"]

    assert (await admin.post("/api/v1/admin/services", json=payload)).status_code == 409

    public = await client.get("/api/v1/services/test-usluga")
    assert public.status_code == 200
    assert public.json()["cover"]["url"] == media["url"]

    payload["is_published"] = False
    assert (await admin.put(f"/api/v1/admin/services/{service_id}", json=payload)).status_code == 200
    assert (await client.get("/api/v1/services/test-usluga")).status_code == 404

    missing_media = {**payload, "cover_id": 999999}
    assert (await admin.put(f"/api/v1/admin/services/{service_id}", json=missing_media)).status_code == 422

    assert (await admin.delete(f"/api/v1/admin/services/{service_id}")).status_code == 204
    assert (await admin.get(f"/api/v1/admin/services/{service_id}")).status_code == 404


async def test_project_with_gallery_category_and_services(admin: AsyncClient, client: AsyncClient) -> None:
    images = [await upload_image(admin) for _ in range(3)]
    category = await admin.post("/api/v1/admin/categories", json={"slug": "test-cat", "title": "Тест", "label": "ТЕСТ"})
    assert category.status_code == 201
    services = (await client.get("/api/v1/services")).json()
    response = await admin.post(
        "/api/v1/admin/projects",
        json={
            "slug": "test-proekt",
            "title": "Тестовый проект",
            "category_id": category.json()["id"],
            "cover_id": images[0]["id"],
            "images": [{"media_id": m["id"], "caption": f"Фото {i}"} for i, m in enumerate(images)],
            "service_ids": [services[0]["id"]],
            "params": [{"k": "Тип", "v": "Корпус"}],
            "is_published": True,
        },
    )
    assert response.status_code == 201, response.text
    project = response.json()
    assert [i["caption"] for i in project["images"]] == ["Фото 0", "Фото 1", "Фото 2"]

    # Перестановка галереи сохраняет новый порядок
    reordered = [{"media_id": m["id"], "caption": c} for m, c in zip(images[::-1], ["a", "b", "c"], strict=True)]
    update = await admin.put(
        f"/api/v1/admin/projects/{project['id']}",
        json={**response.json(), "images": reordered, "service_ids": [services[0]["id"]]},
    )
    assert [i["media"]["id"] for i in update.json()["images"]] == [m["id"] for m in images[::-1]]

    filtered = (await client.get("/api/v1/projects", params={"category": "test-cat"})).json()
    assert [p["slug"] for p in filtered] == ["test-proekt"]
    detail = (await client.get("/api/v1/projects/test-proekt")).json()
    assert detail["location"] == ""
    # Единственный опубликованный проект не ссылается сам на себя
    assert detail["next_project"] is None
    service = (await client.get(f"/api/v1/services/{services[0]['slug']}")).json()
    assert any(p["slug"] == "test-proekt" for p in service["projects"])


async def test_article_drafts_are_hidden_and_html_is_sanitized(admin: AsyncClient, client: AsyncClient) -> None:
    body = '<p onclick="x()">Текст</p><script>alert(1)</script><a href="javascript:alert(1)">ссылка</a>'
    created = await admin.post(
        "/api/v1/admin/articles", json={"slug": "test-statya", "title": "Статья", "body_html": body}
    )
    assert created.status_code == 201
    article = created.json()
    assert "<script" not in article["body_html"]
    assert "onclick" not in article["body_html"]
    assert "javascript:" not in article["body_html"]
    assert (await client.get("/api/v1/articles/test-statya")).status_code == 404

    published = await admin.put(
        f"/api/v1/admin/articles/{article['id']}", json={**article, "status": "published", "published_at": None}
    )
    assert published.json()["published_at"] is not None
    assert (await client.get("/api/v1/articles/test-statya")).status_code == 200


async def test_page_update_and_audit_log(admin: AsyncClient, client: AsyncClient) -> None:
    page = (await admin.get("/api/v1/admin/pages/contacts")).json()
    page["sections"]["hero"]["title"] = "Контакты (тест)"
    saved = await admin.put("/api/v1/admin/pages/contacts", json=page)
    assert saved.status_code == 200
    assert (await client.get("/api/v1/pages/contacts")).json()["sections"]["hero"]["title"] == "Контакты (тест)"

    page["is_published"] = False
    await admin.put("/api/v1/admin/pages/contacts", json=page)
    assert (await client.get("/api/v1/pages/contacts")).status_code == 404

    audit = (await admin.get("/api/v1/admin/audit", params={"action": "update"})).json()
    assert any(entry["entity"] == "page" and entry["entity_id"] == "contacts" for entry in audit["items"])


async def test_invalid_json_characters_return_422(admin: AsyncClient) -> None:
    page = (await admin.get("/api/v1/admin/pages/faq")).json()
    page["sections"]["hero"]["title"] = "bad\u0000value"
    assert (await admin.put("/api/v1/admin/pages/faq", json=page)).status_code == 422


async def test_dashboard_summary(admin: AsyncClient) -> None:
    data = (await admin.get("/api/v1/admin/dashboard")).json()
    assert len(data["leads_daily"]) == 14
    assert set(data["leads_by_status"]) == {"new", "in_progress", "quoted", "done", "rejected", "spam"}
    assert data["leads_total"] == sum(data["leads_by_status"].values())
    assert {"services", "projects", "articles", "pages"} <= set(data["drafts"])


async def test_custom_pages_can_be_created_published_and_deleted(admin: AsyncClient, client: AsyncClient) -> None:
    created = await admin.post("/api/v1/admin/pages", json={"slug": "vakansii", "title": "Вакансии"})
    assert created.status_code == 201
    page = created.json()
    assert page["template"] == "custom"
    assert page["is_published"] is False
    assert (await client.get("/api/v1/pages/vakansii")).status_code == 404

    page["is_published"] = True
    page["body_html"] = "<p>Открытых вакансий нет</p>"
    assert (await admin.put("/api/v1/admin/pages/vakansii", json=page)).status_code == 200
    assert [p["slug"] for p in (await client.get("/api/v1/pages")).json()] == ["vakansii"]

    assert (await admin.post("/api/v1/admin/pages", json={"slug": "vakansii", "title": "Дубль"})).status_code == 409
    assert (await admin.post("/api/v1/admin/pages", json={"slug": "about", "title": "О нас"})).status_code == 422
    assert (await admin.delete("/api/v1/admin/pages/home")).status_code == 400
    assert (await admin.delete("/api/v1/admin/pages/vakansii")).status_code == 204
    assert (await client.get("/api/v1/pages/vakansii")).status_code == 404


async def test_users_and_lead_comments_can_be_deleted(admin: AsyncClient, client: AsyncClient) -> None:
    user = (
        await admin.post(
            "/api/v1/admin/users", json={"email": "temp@example.com", "password": "temp-password-1", "role": "editor"}
        )
    ).json()
    assert (await admin.delete(f"/api/v1/admin/users/{user['id']}")).status_code == 204
    me = (await admin.get("/api/v1/auth/me")).json()["user"]
    assert (await admin.delete(f"/api/v1/admin/users/{me['id']}")).status_code == 400

    token = (await client.get("/api/v1/leads/token")).json()["token"]
    lead = (
        await client.post(
            "/api/v1/leads", data={"name": "Тест", "phone": "+79000000000", "consent": "true", "form_token": token}
        )
    ).json()
    comment = (await admin.post(f"/api/v1/admin/leads/{lead['id']}/comments", json={"body": "Удалить"})).json()
    assert (await admin.delete(f"/api/v1/admin/leads/{lead['id']}/comments/{comment['id']}")).status_code == 204
    assert (await admin.get(f"/api/v1/admin/leads/{lead['id']}")).json()["comments"] == []
