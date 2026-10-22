FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MEDIA_ROOT=/data/media \
    PRIVATE_ROOT=/data/private

WORKDIR /app

RUN useradd --uid 10001 --create-home app \
    && mkdir -p /data/media /data/private \
    && chown -R app:app /data

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app . .

USER app
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4)"

# Один воркер: rate limiter хранит счётчики в памяти процесса.
# Порт backend не публикуется наружу, заголовки X-Forwarded-* приходят только от Caddy.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
