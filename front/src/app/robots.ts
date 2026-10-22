import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { SITE_URL } from "@/lib/seo";

const DISALLOW = ["/admin", "/api/"];

/*
 * Поисковые и AI-краулеры перечислены явно: некоторые из них по умолчанию осторожничают
 * или учитывают только адресованные им правила. Сайту важно попадать в ответы нейросетей
 * (ChatGPT, Claude, Perplexity, Gemini, Алиса/Нейро, Copilot), поэтому доступ открыт всем.
 */
const AI_AND_SEARCH_BOTS = [
  // Поисковики
  "Googlebot",
  "Bingbot",
  "YandexBot",
  // Нейро и Алиса (Яндекс)
  "YandexAdditional",
  // OpenAI: поиск ChatGPT, переходы пользователей, обучение моделей
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  // Anthropic
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google Gemini / AI Overviews, Apple Intelligence
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  // Открытый веб-корпус, на котором учатся многие модели
  "CCBot",
  // Meta AI, DuckDuckGo Assist, Mistral
  "meta-externalagent",
  "DuckAssistBot",
  "MistralAI-User",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Адрес сайта известен только при запуске контейнера — robots.txt не пререндерится при сборке
  await connection();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_AND_SEARCH_BOTS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
