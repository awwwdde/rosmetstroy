import os
import tempfile
from collections.abc import AsyncIterator

# Окружение тестов задаётся до импорта приложения
_tmp = tempfile.mkdtemp(prefix="rms-tests-")
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://rosmetstroy:rosmetstroy@localhost:5432/rosmetstroy_test"
)
os.environ["MEDIA_ROOT"] = os.path.join(_tmp, "media")
os.environ["PRIVATE_ROOT"] = os.path.join(_tmp, "private")
os.environ["LEAD_MIN_FILL_SECONDS"] = "0"
os.environ["REVALIDATE_SECRET"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["TELEGRAM_BOT_TOKEN"] = ""

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.cli import create_admin, seed  # noqa: E402
from app.core.rate_limit import limiter  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test-admin-password"


@pytest.fixture(scope="session", autouse=True)
async def database() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await seed()
    await create_admin(ADMIN_EMAIL, ADMIN_PASSWORD, "Тестовый администратор")
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
def reset_rate_limits() -> None:
    limiter.reset()


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def login(client: AsyncClient, email: str = ADMIN_EMAIL, password: str = ADMIN_PASSWORD) -> str:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    csrf = response.json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf
    return csrf


@pytest.fixture
async def admin(client: AsyncClient) -> AsyncClient:
    await login(client)
    return client
