import pytest
from httpx import AsyncClient

from app.core.config import settings

PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"


async def token(client: AsyncClient) -> str:
    return (await client.get("/api/v1/leads/token")).json()["token"]


async def post_lead(client: AsyncClient, files: list[tuple[str, tuple[str, bytes, str]]] | None = None, **fields: str):
    data = {"name": "Иван", "phone": "+7 900 000-00-00", "description": "Лестница", "form_token": await token(client)}
    data.update(fields)
    return await client.post("/api/v1/leads", data=data, files=files or [])


async def test_lead_is_saved_with_files_and_visible_in_admin(client: AsyncClient, admin: AsyncClient) -> None:
    response = await post_lead(
        client, files=[("files", ("ТЗ.pdf", PDF, "application/pdf"))], service_label="Металлоконструкции"
    )
    assert response.status_code == 201, response.text
    lead = response.json()
    assert lead["number"] == f"RMS-{lead['id']:05d}"

    detail = (await admin.get(f"/api/v1/admin/leads/{lead['id']}")).json()
    assert detail["name"] == "Иван"
    assert detail["status"] == "new"
    assert detail["files"][0]["original_name"] == "ТЗ.pdf"

    download = await admin.get(f"/api/v1/admin/leads/{lead['id']}/files/{detail['files'][0]['id']}")
    assert download.status_code == 200
    assert download.content == PDF
    assert "attachment" in download.headers["content-disposition"]

    status = await admin.patch(f"/api/v1/admin/leads/{lead['id']}/status", json={"status": "in_progress"})
    assert status.json()["status"] == "in_progress"
    comment = await admin.post(f"/api/v1/admin/leads/{lead['id']}/comments", json={"body": "Перезвонить"})
    assert comment.status_code == 201

    listing = (await admin.get("/api/v1/admin/leads", params={"status": "in_progress"})).json()
    assert any(item["id"] == lead["id"] for item in listing["items"])


async def test_lead_files_are_not_publicly_downloadable(client: AsyncClient) -> None:
    lead = (await post_lead(client, files=[("files", ("a.pdf", PDF, "application/pdf"))])).json()
    assert (await client.get(f"/api/v1/admin/leads/{lead['id']}/files/1")).status_code == 401


async def test_lead_requires_contact(client: AsyncClient) -> None:
    response = await post_lead(client, phone="", email="")
    assert response.status_code == 422


async def test_lead_rejects_invalid_phone(client: AsyncClient) -> None:
    assert (await post_lead(client, phone="abc")).status_code == 422


async def test_honeypot_and_forged_token_are_rejected(client: AsyncClient) -> None:
    assert (await post_lead(client, website="http://spam.example")).status_code == 400
    assert (await post_lead(client, form_token="123.deadbeef")).status_code == 400


async def test_too_fast_submission_is_rejected(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "lead_min_fill_seconds", 30)
    assert (await post_lead(client)).status_code == 400


@pytest.mark.parametrize(
    ("name", "content"),
    [
        ("virus.exe", b"MZ\x90\x00"),
        ("fake.pdf", b"<html>not a pdf</html>"),
        ("drawing.dwg", b"not a dwg"),
        ("empty.pdf", b""),
    ],
)
async def test_unsafe_or_mismatched_files_are_rejected(client: AsyncClient, name: str, content: bytes) -> None:
    response = await post_lead(client, files=[("files", (name, content, "application/octet-stream"))])
    assert response.status_code == 422


async def test_file_size_limit(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "lead_max_file_mb", 1)
    big = PDF + b"0" * (1024 * 1024 + 10)
    response = await post_lead(client, files=[("files", ("big.pdf", big, "application/pdf"))])
    assert response.status_code == 422
    assert "МБ" in response.json()["detail"]


async def test_lead_submission_is_rate_limited(client: AsyncClient) -> None:
    statuses = [(await post_lead(client)).status_code for _ in range(6)]
    assert statuses[:5] == [201] * 5
    assert statuses[5] == 429
