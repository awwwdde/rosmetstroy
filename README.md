# Росметстрой — корпоративный сайт и CMS

Многостраничный корпоративный сайт «Росметстрой», собственная административная панель и REST API.

| Слой | Технологии |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, Tailwind CSS 4, GSAP + ScrollTrigger, Motion, Lenis, Zustand, React Hook Form + Zod, TipTap |
| Backend | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic, PostgreSQL 17, Argon2id |
| Инфраструктура | Docker Compose, Caddy 2 (HTTPS, reverse proxy, раздача медиа) |

```text
rosmetstroy/
├── front/              Next.js: публичный сайт (src/app/(site)) и админка (src/app/admin)
├── back/               FastAPI: app/api/v1, models, schemas, repositories, services; alembic; tests
├── deploy/platform/    Caddy и скрипт запуска единого образа (корневой Dockerfile)
├── Dockerfile          Единый образ для платформы деплоя
├── docker-compose.yml  Production: postgres, backend, frontend, caddy
├── docker-compose.dev.yml  Только PostgreSQL для локальной разработки
├── Caddyfile
└── .env.example
```

## Архитектура

- **Данные** — только в PostgreSQL. Тексты страниц хранятся как JSON-секции в рамках шаблонов
  (`front/src/features/admin/page-templates.ts` ↔ `front/src/types/content.ts`), услуги, проекты,
  статьи, FAQ, категории, медиа, заявки и настройки сайта — в отдельных таблицах. Стартовый контент
  из макетов загружается командой `seed`.
- **Рендеринг** — Server Components, данные загружаются функциями с `'use cache'` + `cacheTag`
  (`front/src/services/content.ts`): страницы пререндерятся статически, а после сохранения в CMS
  backend вызывает внутренний хук `/api/revalidate`, и Next.js обновляет кэш по тегам (ISR).
  Если API недоступен во время сборки (`docker build`), страницы собираются как Partial Prerender
  и получают данные при первом запросе.
- **Маршрутизация в production** — Caddy: `/api/v1/*` → FastAPI, `/media/*` → файлы из volume,
  остальное → Next.js. `/api/revalidate` снаружи закрыт, PostgreSQL не публикуется.
- **Локализация** — у контентных таблиц есть поле `locale` (сейчас `ru`), API принимает `?locale=`.
  Для английской версии достаточно добавить записи с `locale=en` и сегмент `[locale]` во фронтенде.
- **Анимации** — GSAP: появление блоков (`Reveal`), параллакс первого экрана (`Parallax`), плавная
  прокрутка Lenis синхронизирована с ScrollTrigger. Motion: меню, аккордеоны, вкладки производства,
  фильтр проектов, состояния форм, модальные окна. Одно свойство одним инструментом не анимируется,
  контексты GSAP очищаются (`useGSAP`), всё отключается при `prefers-reduced-motion`; Lenis и параллакс
  работают только на desktop.

### Страницы

`/` · `/about` · `/services` · `/services/[slug]` · `/metalwork` (бывший `/production`, 308-редирект) · `/projects` · `/projects/[slug]` ·
`/blog` · `/blog/[slug]` · `/faq` · `/contacts` · `/request` · `/privacy` · 404 · `/sitemap.xml` · `/robots.txt`

Админка: `/admin` — обзор, заявки, страницы, услуги, проекты, категории, блог, FAQ, медиатека,
настройки сайта, пользователи, журнал действий, смена пароля.

### API (`/api/v1`, OpenAPI — `/api/v1/openapi.json`, Swagger в dev — `/api/docs`)

| Группа | Публично | Администрирование (`/api/v1/admin/...`) |
|---|---|---|
| `auth` | `login`, `logout`, `me`, `password` | — |
| `pages` | `GET /pages/{slug}` | список, чтение, изменение |
| `services`, `projects`, `articles` | списки и карточки (только опубликованные) | CRUD, пагинация, поиск, сортировка `?sort=-field` |
| `categories`, `faq` | списки | CRUD |
| `media` | файлы по `/media/...` | загрузка, alt, удаление |
| `leads` | `GET /leads/token`, `POST /leads` | список с фильтрами, статус, комментарии, скачивание файлов, удаление |
| `settings` | `GET /settings/site` | изменение (только admin) |
| `admin` | — | `dashboard`, `users`, `audit` |
| `health` | `GET /health` | — |

### Безопасность

- Сессии в БД, httpOnly + SameSite=Lax cookie (`Secure` в production), токены не хранятся в localStorage.
- CSRF: double-submit cookie `rms_csrf` + заголовок `X-CSRF-Token` для всех изменяющих запросов.
- Роли: `admin` (всё) и `editor` (контент и заявки). Пароли — Argon2id, сброс всех сессий при смене пароля.
- Rate limiting: вход — 10 попыток / 15 мин на IP и на e-mail, заявки — 5 / 10 мин на IP.
- Антиспам заявок: подписанный HMAC токен формы (минимальное время заполнения), поле-ловушка.
- Загрузки: проверка сигнатуры содержимого (PDF, DWG, DXF, JPG, PNG, ZIP; изображения — через Pillow),
  лимиты размера и количества, вложения заявок хранятся вне публичной директории и отдаются только админке.
- HTML статей очищается на сервере (nh3). Журнал критических действий (входы, изменения, скачивания).
- Заголовки безопасности и CSP — в Caddy; CORS ограничен доменом сайта; секреты только на сервере.

## SEO и видимость в нейросетях (GEO)

- **Метаданные** каждой страницы: title, description, canonical, Open Graph и Twitter-карточки,
  `max-snippet:-1` и `max-image-preview:large` — поисковики и AI-ответы могут цитировать текст и показывать крупные превью.
- **Структурированные данные schema.org** единым графом: организация (`GeneralContractor`) и сайт на всех страницах;
  `Service` + `FAQPage` у услуг, `CreativeWork` у проектов, `BlogPosting` у статей, `CollectionPage`/`ItemList`
  у каталогов, `AboutPage`, `ContactPage`, хлебные крошки. ИНН, ОГРН и география работ попадают в разметку,
  когда заполнены в «Настройки сайта».
- **`/llms.txt` и `/llms-full.txt`** ([llmstxt.org](https://llmstxt.org)) — описание компании, услуг, проектов,
  вопросов и статей для ChatGPT, Claude, Perplexity, Gemini, Алисы. Собираются из CMS автоматически.
- **`robots.txt`** явно открывает сайт поисковым и AI-краулерам (YandexBot, YandexAdditional, Googlebot,
  Google-Extended, Bingbot, OAI-SearchBot, GPTBot, ClaudeBot, PerplexityBot и др.); закрыты только `/admin` и `/api/`.
- **`sitemap.xml`** с датами изменения и изображениями.
- **IndexNow**: после каждого сохранения в CMS Яндекс и Bing получают список изменённых страниц
  (только в production с https-адресом; ключ — `/indexnow-key.txt`).
- **Подтверждение прав** в Яндекс Вебмастере, Google Search Console и Bing Webmaster — коды вводятся
  в «Настройки сайта → Поисковые системы».

После запуска на боевом домене: подтвердите сайт в Яндекс Вебмастере и Google Search Console, отправьте
`sitemap.xml`, укажите регион в Вебмастере и заполните в CMS реквизиты и географию работ.

## Локальная разработка

Требования: Node.js 22, Python 3.12+, Docker.

```bash
docker compose -f docker-compose.dev.yml up -d
```

```bash
cd back && python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt   # Linux/macOS: .venv/bin/pip
cp .env.example .env
.venv/Scripts/alembic upgrade head
.venv/Scripts/python -m app.cli seed
.venv/Scripts/python -m app.cli create-admin --email admin@rosmetstroy.local
.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

```bash
cd front && npm ci && cp .env.example .env.local && npm run dev
```

Сайт — http://localhost:3001, админка — http://localhost:3001/admin (порт 3001 закреплён в `npm run dev`). Запросы `/api/v1` и `/media`
dev-сервер Next.js проксирует на `localhost:8000`. Если запускаете Next.js на другом порту,
укажите его в `FRONTEND_INTERNAL_URL` в `back/.env` — иначе изменения из CMS появятся на сайте
только после истечения кэша.

Проверки качества:

```bash
cd back && .venv/Scripts/ruff check app tests && .venv/Scripts/ruff format --check app tests && .venv/Scripts/pytest
```

```bash
cd front && npm run typecheck && npm run lint && npm run format:check && npm run build
```

Тесты backend используют отдельную БД `rosmetstroy_test` (создать один раз:
`docker compose -f docker-compose.dev.yml exec postgres createdb -U rosmetstroy rosmetstroy_test`).
TypeScript-типы API генерируются из OpenAPI: `npm run api:types` (backend должен быть запущен).

## Деплой на платформу `*.awwwdde.art`

Один образ из корневого `Dockerfile` (порт 8080, `/healthz`, файлы в PostgreSQL). Перед первым деплоем задайте в панели `ADMIN_EMAIL` и `ADMIN_PASSWORD` — подробности в [docs/deploy-platform.md](docs/deploy-platform.md).

## Развёртывание на VPS

1. Установите Docker, направьте DNS домена на сервер, откройте порты 80 и 443.
2. Скопируйте проект и создайте `.env` по шаблону `.env.example` (секреты — `python -c "import secrets; print(secrets.token_urlsafe(48))"`).
3. Первый запуск (миграции применяются автоматически при старте backend):

```bash
docker compose up -d --build
```

```bash
docker compose exec backend python -m app.cli seed
```

```bash
docker compose exec backend python -m app.cli create-admin --email admin@rosmetstroy.ru
```

Caddy сам выпустит сертификат Let's Encrypt для `SITE_DOMAIN`.

### Эксплуатация

| Задача | Команда |
|---|---|
| Применить миграции вручную | `docker compose exec backend alembic upgrade head` |
| Создать / сбросить пароль администратора | `docker compose exec backend python -m app.cli create-admin --email ...` |
| Обновить после изменений кода | `git pull && docker compose up -d --build` |
| Логи | `docker compose logs -f backend frontend caddy` |
| Резервная копия БД | `docker compose exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /backups/db-$(date +%F).dump'` (файл появится в `./backups`) |
| Резервная копия медиа | `docker run --rm -v rosmetstroy_media:/data:ro -v "$PWD/backups":/backup alpine tar czf /backup/media-$(date +%F).tgz -C /data .` |
| Резервная копия вложений заявок | то же для тома `rosmetstroy_private_files` |
| Восстановить БД | `docker compose exec postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /backups/db-ГГГГ-ММ-ДД.dump'` |
| Восстановить медиа | `docker run --rm -v rosmetstroy_media:/data -v "$PWD/backups":/backup alpine tar xzf /backup/media-ГГГГ-ММ-ДД.tgz -C /data` |

Резервное копирование удобно запускать по cron. Вместо локального тома медиа можно использовать
S3-совместимое хранилище: `STORAGE_BACKEND=s3` и переменные `S3_*` в `.env`.

Уведомления о заявках включаются заполнением `SMTP_*`/`NOTIFY_EMAILS` и/или `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.

## Позиционирование и достоверность контента

Компания представлена как исполнитель и организатор работ: работы выполняют собственные специалисты
и профильные подрядчики, IT-услуги — партнёрская студия. Сведения о собственном заводе, оборудовании,
автопарке, а также рекламные цифры и гарантии на сайте не используются.

- Подтверждённые показатели и реквизиты заполняются в «Настройки сайта»; пока они пусты, блоки скрыты.
- В базе нет опубликованных проектов — только неопубликованный «Шаблон кейса» в CMS. У проекта есть поля
  «Местоположение», «Роль „Росметстрой“», задача, выполненные работы, фотогалерея, подтверждённые характеристики, результат.
- Тест `test_seed_has_no_unconfirmed_claims` проверяет, что стартовый контент не содержит запрещённых формулировок.

## Отличия от макетов и что требует внимания

- В макетах нарисованы Главная, Услуга, Проекты, Проект, Заявка (с состояниями) и 404. Страницы
  «О компании», «Работа с металлом», «Услуги», «Блог», «Статья», «FAQ», «Контакты», «Политика» собраны
  из тех же компонентов и визуальной системы.
- Главная перестроена по брифу позиционирования: «О компании», направления (металлоконструкции — крупная
  карточка), «Какие задачи решаем», проекты, «Как мы работаем», «Почему с нами сотрудничают», IT-партнёр,
  FAQ, заявка. Блок «Технологический маршрут» с главной убран.
- Из фотографий в макетах есть только `hero-frame.png`; остальные места помечены как image-slot.
  До загрузки фото в CMS на их месте показывается фирменная заглушка с описанием кадра.
- Тексты услуг, две статьи блога и политика конфиденциальности — стартовые формулировки без
  неподтверждённых фактов; их нужно проверить в CMS (политику — согласовать с юристом).
- На экранах уже 480px заголовки первого экрана слегка уменьшаются, чтобы слово
  «Металлоконструкции» помещалось без разрыва.
- Rate limiter хранит счётчики в памяти, поэтому backend запускается одним процессом (достаточно для одного VPS).
