import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SITE_URL } from "@/lib/seo";

/*
 * Баннер для соцсетей и мессенджеров (og:image) с заголовком страницы: /og?title=…&section=….
 * Без фотографий, только плоские формы — PNG весит ~30–60 КБ и укладывается в лимиты
 * WhatsApp (300 КБ) и быстро отдаётся Telegram и VK. Шрифты и логотип лежат в образе
 * (outputFileTracingIncludes в next.config.ts), сеть при генерации не нужна.
 */

const SIZE = { width: 1200, height: 630 };
const NAVY = "#071d36";
const SKY = "#a9d4ff";
const ACCENT = "#076de0";

const assets = Promise.all([
  readFile(join(process.cwd(), "src/assets/fonts/Onest-Medium.ttf")),
  readFile(join(process.cwd(), "src/assets/fonts/Onest-Bold.ttf")),
  readFile(join(process.cwd(), "public/brand/logo-white.svg"), "utf8"),
]);

const clip = (value: string | null, max: number) => {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = clip(params.get("title"), 110) || "Металлоконструкции и комплексные решения";
  const section = clip(params.get("section"), 40);
  const titleSize = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;
  const [medium, bold, logo] = await assets;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: NAVY,
          backgroundImage: `linear-gradient(135deg, ${NAVY} 0%, #0a2747 55%, #103d70 100%)`,
          fontFamily: "Onest",
          color: "#fff",
        }}
      >
        {/* Крупный знак логотипа справа: три наклонные балки */}
        <svg
          width="620"
          height="630"
          viewBox="0 0 216 220"
          style={{ position: "absolute", right: -70, top: 0, opacity: 0.16 }}
        >
          <polygon points="12,206 12,140 86,66 86,132" fill={SKY} />
          <polygon points="78,206 78,150 145,83 145,139" fill={SKY} />
          <polygon points="140,206 140,160 194,106 194,150" fill={SKY} />
        </svg>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, backgroundColor: ACCENT }} />

        <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: "64px 80px 56px 94px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse понимает только <img> */}
          <img src={`data:image/svg+xml;base64,${Buffer.from(logo).toString("base64")}`} width={382} height={64} alt="" />

          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", maxWidth: 900 }}>
            {section ? (
              <div style={{ fontSize: 28, fontWeight: 500, color: SKY, letterSpacing: 3, textTransform: "uppercase", marginBottom: 22 }}>
                {section}
              </div>
            ) : null}
            <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 500, color: SKY }}>
            <div style={{ width: 40, height: 3, backgroundColor: ACCENT, marginRight: 18 }} />
            {new URL(SITE_URL).host}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Onest", data: medium, weight: 500, style: "normal" },
        { name: "Onest", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
    },
  );
}
