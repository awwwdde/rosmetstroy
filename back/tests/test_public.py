from httpx import AsyncClient


async def test_seeded_home_page_and_settings(client: AsyncClient) -> None:
    home = (await client.get("/api/v1/pages/home")).json()
    assert home["sections"]["hero"]["title"].startswith("Металлоконструкции")
    site = (await client.get("/api/v1/settings/site")).json()["value"]
    assert site["phone"] == "8 800 600-84-77"


async def test_private_settings_keys_are_not_exposed(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/settings/secrets")).status_code == 404


async def test_public_lists_are_ordered_and_published_only(client: AsyncClient) -> None:
    services = (await client.get("/api/v1/services")).json()
    assert services[0]["slug"] == "metallokonstrukcii"
    assert all(s["is_published"] for s in services)
    service = (await client.get("/api/v1/services/metallokonstrukcii")).json()
    assert len(service["faq"]) == 6
    assert service["scope"]
    assert service["execution_note"]
    # В стартовом контенте нет опубликованных кейсов: только неопубликованный шаблон
    published = (await client.get("/api/v1/projects")).json()
    assert all(p["slug"].startswith("test-") for p in published)
    assert (await client.get("/api/v1/projects/shablon-kejsa")).status_code == 404


async def test_seed_has_no_unconfirmed_claims(client: AsyncClient) -> None:
    banned = ["собственн", "без посредник", "завод", "наш цех", "производственная площадка", "экскурси", "сертификат"]
    texts = [(await client.get(f"/api/v1/pages/{slug}")).text for slug in ("home", "about", "metalwork", "services")]
    services = (await client.get("/api/v1/services")).json()
    texts += [(await client.get(f"/api/v1/services/{s['slug']}")).text for s in services]
    texts.append((await client.get("/api/v1/faq")).text)
    joined = " ".join(texts).lower()
    # «собственными специалистами» допустимо: так компания описывает своих сотрудников по заданию
    joined = joined.replace("собственными специалистами", "").replace("собственные специалисты", "")
    for word in banned:
        assert word not in joined, word


async def test_unknown_resources_return_404(client: AsyncClient) -> None:
    for path in ("/api/v1/pages/nope", "/api/v1/services/nope", "/api/v1/projects/nope", "/api/v1/articles/nope"):
        assert (await client.get(path)).status_code == 404


async def test_locale_parameter_is_validated(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/services", params={"locale": "de"})).status_code == 422
    assert (await client.get("/api/v1/services", params={"locale": "en"})).json() == []
