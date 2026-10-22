import { connection } from "next/server";

import { buildLlmsFullTxt } from "@/features/seo/llms";

// Полный текст сайта одним документом — для нейросетей, которые индексируют сайт целиком
export async function GET() {
  await connection();
  return new Response(await buildLlmsFullTxt(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
