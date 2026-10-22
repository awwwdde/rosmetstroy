import { connection } from "next/server";

import { apiText } from "@/lib/server-api";

// Ключ IndexNow: подтверждает Яндексу и Bing, что уведомления об изменениях отправляет владелец сайта
export async function GET() {
  await connection();
  const key = await apiText("/indexnow-key");
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
