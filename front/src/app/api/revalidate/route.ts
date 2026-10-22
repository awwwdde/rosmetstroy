import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const ALLOWED_TAGS = new Set(["pages", "services", "projects", "articles", "faq", "settings"]);

function secretMatches(received: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Вызывается backend-ом после изменения контента в CMS: сбрасывает кэш данных по тегам. */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED_TAGS.has(t))
    : [];
  // Немедленное истечение, а не stale-while-revalidate («max»): после сохранения в CMS
  // уже первый посетитель должен увидеть новую версию, а не старую из кэша
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
