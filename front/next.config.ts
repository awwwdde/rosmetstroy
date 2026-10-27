import type { NextConfig } from "next";

// Адрес FastAPI внутри docker-сети (или localhost в разработке).
// Нужен на этапе сборки, потому что rewrites попадают в routes-manifest.
const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  // Метаданные в <head> для всех: маркер добавляет src/proxy.ts к каждому запросу страницы
  htmlLimitedBots: /RmsBlockingMetadata/,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/images/**" }],
    remotePatterns: S3_PUBLIC_URL ? [new URL(`${S3_PUBLIC_URL.replace(/\/$/, "")}/**`)] : [],
  },
  async redirects() {
    // Страница «Производство» переименована в «Работа с металлом»
    return [{ source: "/production", destination: "/metalwork", permanent: true }];
  },
  async rewrites() {
    // В production эти пути перехватывает Caddy; rewrites нужны для dev
    // и для оптимизатора изображений Next, который запрашивает /media у себя.
    return [
      { source: "/api/v1/:path*", destination: `${API_INTERNAL_URL}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${API_INTERNAL_URL}/media/:path*` },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
