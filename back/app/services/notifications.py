"""Уведомления о новых заявках: e-mail (SMTP) и Telegram — включаются через окружение."""

import logging
from email.message import EmailMessage

import aiosmtplib
import httpx

from app.core.config import settings

log = logging.getLogger(__name__)


def lead_summary(data: dict[str, str]) -> str:
    rows = [
        f"Заявка {data['number']}",
        f"Имя: {data['name']}",
        f"Компания: {data['company'] or '—'}",
        f"Телефон: {data['phone'] or '—'}",
        f"E-mail: {data['email'] or '—'}",
        f"Направление: {data['service'] or '—'}",
        f"Файлов: {data['files']}",
        "",
        data["description"] or "Описание не указано",
        "",
        f"Открыть в админке: {settings.site_url.rstrip('/')}/admin/leads/{data['id']}",
    ]
    return "\n".join(rows)


async def send_email(subject: str, body: str) -> None:
    if not (settings.smtp_host and settings.notify_emails and settings.smtp_from):
        return
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = ", ".join(settings.notify_emails)
    msg["Subject"] = subject
    msg.set_content(body)
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=settings.smtp_starttls,
        timeout=20,
    )


async def send_telegram(text: str) -> None:
    if not (settings.telegram_bot_token and settings.telegram_chat_id):
        return
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json={"chat_id": settings.telegram_chat_id, "text": text})
        resp.raise_for_status()


def lead_short(data: dict[str, str]) -> str:
    """Уведомление без персональных данных: серверы Telegram находятся за рубежом, а передача туда
    имён и телефонов была бы трансграничной передачей ПД (152-ФЗ, ст. 12). Подробности — в админке."""
    return "\n".join(
        [
            f"Новая заявка {data['number']}",
            f"Направление: {data['service'] or '—'}",
            f"Файлов: {data['files']}",
            f"Открыть в админке: {settings.site_url.rstrip('/')}/admin/leads/{data['id']}",
        ]
    )


async def notify_new_lead(data: dict[str, str]) -> None:
    text = lead_summary(data)
    # Сбой уведомления не должен влиять на сохранённую заявку
    try:
        await send_email(f"Новая заявка {data['number']} — Росметстрой", text)
    except Exception:
        log.exception("Не удалось отправить e-mail по заявке %s", data["number"])
    try:
        await send_telegram(lead_short(data))
    except Exception:
        log.exception("Не удалось отправить сообщение в Telegram по заявке %s", data["number"])
