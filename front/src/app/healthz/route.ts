// Проверка живости для платформы деплоя: отвечает без обращения к API и базе
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
