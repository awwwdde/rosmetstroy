"""Служебные команды.

python -m app.cli create-admin --email admin@example.com [--password ...] [--name ...]
python -m app.cli seed
python -m app.cli bootstrap   # запуск контейнера: seed + администратор из ADMIN_EMAIL/ADMIN_PASSWORD
"""

import argparse
import asyncio
import getpass
import os
import sys
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app import seed_data as data
from app.core.sanitize import reading_minutes
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Article, Category, FaqItem, Page, Project, Role, Service, SiteSetting, User


async def create_admin(email: str, password: str, name: str) -> None:
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(func.lower(User.email) == email.lower()))
        if user is None:
            user = User(email=email.lower(), full_name=name, role=Role.admin)
            db.add(user)
            print(f"Создан администратор {email}")
        else:
            user.role = Role.admin
            user.is_active = True
            print(f"Пароль администратора {email} обновлён")
        user.password_hash = hash_password(password)
        await db.commit()


async def seed() -> None:
    async with SessionLocal() as db:
        if await db.scalar(select(func.count()).select_from(Page)):
            print("База уже содержит контент — наполнение пропущено")
            return

        db.add(SiteSetting(key="site", value=data.SITE_SETTINGS))
        for page in data.PAGES:
            fields = {k: v for k, v in page.items() if k != "body_html"}
            db.add(Page(body_html=page.get("body_html", ""), template=page["slug"], **fields))

        categories = {c["slug"]: Category(**c) for c in data.CATEGORIES}
        db.add_all(categories.values())

        services: dict[str, Service] = {}
        for raw in data.SERVICES:
            fields = {k: v for k, v in raw.items() if k != "faq"}
            service = Service(projects=[], **fields)
            for order, (q, a) in enumerate(raw.get("faq", [])):
                service.faq.append(FaqItem(question=q, answer=a, sort_order=order))
            services[raw["slug"]] = service
            db.add(service)

        for order, (q, a) in enumerate(data.GENERAL_FAQ):
            db.add(FaqItem(question=q, answer=a, sort_order=100 + order))

        # Реальные кейсы добавляются через CMS; в базу кладётся только неопубликованный шаблон
        db.add(Project(category=categories["karkasy"], services=[], images=[], **data.PROJECT_TEMPLATE))

        now = datetime.now(UTC)
        for i, article in enumerate(data.ARTICLES):
            db.add(
                Article(
                    **article,
                    status="published",
                    published_at=now - timedelta(days=7 * (i + 1)),
                    reading_minutes=reading_minutes(article["body_html"]),
                )
            )
        await db.commit()
        print("Стартовый контент загружен")


async def bootstrap() -> None:
    """Идемпотентная подготовка базы при старте контейнера.

    Администратор из ADMIN_EMAIL / ADMIN_PASSWORD создаётся, если пользователя с таким e-mail
    ещё нет, — даже когда в базе уже есть другие пользователи. Пароль существующего
    пользователя не перезаписывается (его могли сменить в админке); сбросить его можно,
    задав ADMIN_RESET_PASSWORD=true на один деплой.
    """
    await seed()
    email = os.environ.get("ADMIN_EMAIL", "").strip()
    password = os.environ.get("ADMIN_PASSWORD", "")
    async with SessionLocal() as db:
        has_users = bool(await db.scalar(select(func.count()).select_from(User)))
        existing = await db.scalar(select(User).where(func.lower(User.email) == email.lower())) if email else None
    if not email:
        if not has_users:
            print("Пользователей нет: задайте ADMIN_EMAIL и ADMIN_PASSWORD (не короче 10 символов) и передеплойте")
        return
    if len(password) < 10:
        print("ADMIN_PASSWORD короче 10 символов — администратор из окружения не создан")
        return
    reset = os.environ.get("ADMIN_RESET_PASSWORD", "").strip().lower() in {"1", "true", "yes"}
    if existing is None or reset:
        await create_admin(email, password, os.environ.get("ADMIN_NAME", "Администратор"))


def main() -> None:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    admin = sub.add_parser("create-admin", help="Создать администратора или сбросить его пароль")
    admin.add_argument("--email", required=True)
    admin.add_argument("--password", help="Если не указан — будет запрошен интерактивно")
    admin.add_argument("--name", default="Администратор")
    sub.add_parser("seed", help="Загрузить стартовый контент из дизайна")
    sub.add_parser("bootstrap", help="Стартовый контент и первый администратор из окружения")
    args = parser.parse_args()

    if args.command == "create-admin":
        password = args.password or getpass.getpass("Пароль: ")
        if len(password) < 10:
            sys.exit("Пароль должен быть не короче 10 символов")
        asyncio.run(create_admin(args.email, password, args.name))
    elif args.command == "seed":
        asyncio.run(seed())
    elif args.command == "bootstrap":
        asyncio.run(bootstrap())


if __name__ == "__main__":
    main()
