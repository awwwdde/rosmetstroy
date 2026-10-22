import { connection } from "next/server";

import { buildLlmsTxt } from "@/features/seo/llms";

// Описание сайта для нейросетей (https://llmstxt.org); данные — из CMS, адреса — с боевым доменом
export async function GET() {
  await connection();
  return new Response(await buildLlmsTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
