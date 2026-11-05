# Telegram-бот панели

Бот работает внутри backend через long polling: backend сам ходит в Bot API, входящих адресов нет.
Состояние бота видно в панели: «Настройки учётной записи» → «Уведомления в Telegram».

## Переменные окружения

| Переменная | Обязательна | Значение |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | да | токен от @BotFather |
| `TELEGRAM_PROXY` | если хостинг блокирует Telegram | `socks5://логин:пароль@хост:1080` или `http://…` |
| `TELEGRAM_API_URL` | вместо прокси | свой посредник Bot API, по умолчанию `https://api.telegram.org` |
| `TELEGRAM_LEAD_DETAILS` | нет | `false` — в заявках без персональных данных |
| `TELEGRAM_BOT_USERNAME`, `TELEGRAM_TIMEZONE`, `TELEGRAM_CHAT_ID` | нет | см. `.env.example` |

В @BotFather: `/setdomain` → домен сайта, иначе «Войти в панель» спросит пароль.

## «Нет связи с api.telegram.org»

Сервер не может подключиться к Telegram — часть российских хостингов его блокирует.
Нужен посредник за рубежом. **Через посредника проходит токен бота и текст уведомлений
(в том числе данные заявок), поэтому используйте только свой сервер или свой аккаунт —
не публичные бесплатные прокси.**

### Вариант 1. Свой SOCKS5-прокси на зарубежном VPS

На VPS (Docker):

```bash
docker run -d --restart unless-stopped --name tg-socks -p 1080:1080 \
  -e PROXY_USER=rms -e PROXY_PASSWORD='длинный-случайный-пароль' serjs/go-socks5-proxy
```

В окружении backend: `TELEGRAM_PROXY=socks5://rms:длинный-случайный-пароль@IP-VPS:1080`.
Пароль обязателен, а в файрволе VPS лучше открыть порт 1080 только для IP сервера сайта.

### Вариант 2. Cloudflare Worker (бесплатно, без своего сервера)

Cloudflare → Workers & Pages → Create Worker, код:

```js
// Числовая часть токена до двоеточия (это не секрет): Worker пропускает только этого бота
const BOT_ID = "1234567890";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Только методы Bot API нашего бота — посредник не открыт для чужих ботов и других адресов
    if (!url.pathname.startsWith(`/bot${BOT_ID}:`)) return new Response("Not found", { status: 404 });
    return fetch("https://api.telegram.org" + url.pathname + url.search, {
      method: request.method,
      headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
      body: request.method === "GET" ? undefined : request.body,
    });
  },
};
```

В окружении backend: `TELEGRAM_API_URL=https://<имя>.<аккаунт>.workers.dev`.
Домен `workers.dev` у части провайдеров тоже ограничен — тогда привяжите к Worker свой поддомен
(например, `tg.rosmetstroy.ru`) в настройках Worker → Domains & Routes.

После изменения переменных перезапустите backend; через минуту красная плашка в карточке пропадёт.
