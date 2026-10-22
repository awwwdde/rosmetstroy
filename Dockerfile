# Единый образ для платформы деплоя (поддомены *.awwwdde.art, см. docs/deploy-platform.md):
# один контейнер, порт 8080, GET /healthz, состояние только в PostgreSQL.
# Внутри: Caddy :8080 → Next.js 127.0.0.1:3000 и FastAPI 127.0.0.1:8000.
# Для собственного сервера по-прежнему подходит docker-compose.yml с отдельными сервисами.

# ---------- frontend ----------
# Debian, а не alpine: в standalone-сборку попадают нативные модули (sharp) под glibc runtime-образа
FROM node:22.20.0-bookworm-slim AS front-build
WORKDIR /src
ENV NEXT_TELEMETRY_DISABLED=1 \
    # Rewrites попадают в routes-manifest на этапе сборки
    API_INTERNAL_URL=http://127.0.0.1:8000
COPY front/package.json front/package-lock.json ./
RUN npm ci
COPY front/ ./
RUN npm run build

FROM caddy:2.10.2-alpine AS caddy

# ---------- runtime ----------
FROM python:3.13-slim

# curl — для healthcheck платформы; libstdc++6 — для node
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=front-build /usr/local/bin/node /usr/local/bin/node
COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    ENVIRONMENT=production \
    # Диск контейнера стирается при деплое — медиа и вложения заявок хранятся в PostgreSQL
    STORAGE_BACKEND=db \
    XDG_CONFIG_HOME=/tmp/caddy \
    XDG_DATA_HOME=/tmp/caddy

WORKDIR /app

COPY back/requirements.txt back/requirements.txt
RUN pip install -r back/requirements.txt

RUN useradd --uid 10001 --create-home app

COPY --chown=app:app back/ back/
COPY --from=front-build --chown=app:app /src/.next/standalone front/
COPY --from=front-build --chown=app:app /src/.next/static front/.next/static
COPY --from=front-build --chown=app:app /src/public front/public
COPY deploy/platform/Caddyfile deploy/platform/start.sh ./
RUN chmod +x start.sh

USER app
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -fsS http://localhost:8080/healthz || exit 1

CMD ["./start.sh"]
