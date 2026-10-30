#!/usr/bin/env bash
# Запуск единого образа: миграции → FastAPI и Next.js → Caddy на :8080.
# Если любой из процессов завершился, завершается и контейнер — платформа его перезапустит.
set -euo pipefail

# ---- окружение платформы → переменные приложения ----
: "${DATABASE_URL:?Не задан DATABASE_URL}"
: "${SECRET_KEY:?Не задан SECRET_KEY}"

# Основной домен — на него указывают canonical, sitemap, Host в robots.txt и ссылки в уведомлениях.
# Адрес платформы <slug>.awwwdde.art остаётся рабочим и разрешён в CORS. MAIN_SITE_URL в .env стенда
# переопределяет домен; без PUBLIC_SITE_URL (локальная проверка образа) используется localhost.
PLATFORM_URL="${PUBLIC_SITE_URL:-}"
PLATFORM_URL="${PLATFORM_URL%/}"
if [[ -n "$PLATFORM_URL" ]]; then
  SITE="${MAIN_SITE_URL:-https://rosmetstroy.ru}"
else
  SITE="${SITE_URL:-http://localhost:8080}"
fi
SITE="${SITE%/}"
export PUBLIC_SITE_URL="$SITE"
export SITE_URL="$SITE"
if [[ -n "$PLATFORM_URL" && "$PLATFORM_URL" != "$SITE" ]]; then
  export CORS_ORIGINS="${CORS_ORIGINS:-$SITE,$PLATFORM_URL}"
else
  export CORS_ORIGINS="${CORS_ORIGINS:-$SITE}"
fi
if [[ "$SITE" == https://* ]]; then
  export COOKIE_SECURE="${COOKIE_SECURE:-true}"
else
  export COOKIE_SECURE="${COOKIE_SECURE:-false}"
fi
# Секрет хука инвалидации кэша: если не задан явно, выводится из стабильного SECRET_KEY
if [[ -z "${REVALIDATE_SECRET:-}" ]]; then
  REVALIDATE_SECRET="$(python -c 'import hashlib, hmac, os; print(hmac.new(os.environ["SECRET_KEY"].encode(), b"revalidate", hashlib.sha256).hexdigest())')"
  export REVALIDATE_SECRET
fi
export API_INTERNAL_URL="http://127.0.0.1:8000"
export FRONTEND_INTERNAL_URL="http://127.0.0.1:3000"

# ---- база ----
cd /app/back
alembic upgrade head
python -m app.cli bootstrap

# ---- процессы ----
# Один воркер: rate limiter хранит счётчики в памяти процесса
uvicorn app.main:app --host 127.0.0.1 --port 8000 \
  --proxy-headers --forwarded-allow-ips=127.0.0.1 --no-server-header &

cd /app/front
HOSTNAME=127.0.0.1 PORT=3000 node server.js &

trap 'kill $(jobs -p) 2>/dev/null; exit 0' TERM INT

wait_for() {
  for _ in $(seq 1 90); do
    curl -fs -o /dev/null "$1" 2>/dev/null && return 0
    sleep 1
  done
  echo "Не дождались $1" >&2
  return 1
}
wait_for http://127.0.0.1:8000/api/v1/health
wait_for http://127.0.0.1:3000/healthz

# Caddy стартует последним: /healthz отвечает 200, только когда поднято всё приложение
caddy run --config /app/Caddyfile --adapter caddyfile &

set +e
wait -n
status=$?
echo "Процесс завершился с кодом $status — останавливаю контейнер" >&2
kill $(jobs -p) 2>/dev/null || true
exit "$status"
