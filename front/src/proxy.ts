import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "rms_session";

/**
 * Маркер для htmlLimitedBots (next.config.ts). Next.js по умолчанию отдаёт метаданные в <head>
 * только ботам из своего списка, а остальным — потоком в конце страницы, и тогда Lighthouse
 * в Chrome и часть SEO-сервисов не видят description. Маркер в User-Agent включает режим
 * «метаданные в <head>» для всех запросов страниц. При сборке маркера нет, поэтому пререндер
 * работает как обычно.
 */
const BLOCKING_METADATA_MARKER = "RmsBlockingMetadata";

/**
 * Страницы публичного сайта: метаданные в <head>.
 * /admin: первичная защита — без cookie сессии переадресация на вход
 * (проверку самой сессии и прав выполняет backend на каждом запросе к API).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    // В режиме разработки маркер не нужен и мешает проверке статической оболочки страниц
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    const headers = new Headers(request.headers);
    headers.set("user-agent", `${request.headers.get("user-agent") ?? ""} ${BLOCKING_METADATA_MARKER}`);
    return NextResponse.next({ request: { headers } });
  }

  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  // Всё, кроме статики, API, медиа и служебных файлов
  matcher: [
    "/((?!_next/|api/|media/|images/|brand/|favicon\\.ico|icon|apple-icon|manifest|robots\\.txt|sitemap\\.xml|llms|indexnow-key\\.txt|healthz).*)",
  ],
};
