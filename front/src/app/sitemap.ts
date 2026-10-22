import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { getArticles, getCustomPages, getProjects, getServices } from "@/services/content";

const STATIC_ROUTES = [
  "/",
  "/about",
  "/services",
  "/metalwork",
  "/projects",
  "/blog",
  "/faq",
  "/contacts",
  "/request",
  "/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, articles, pages] = await Promise.all([
    getServices(),
    getProjects(),
    getArticles(1, 50),
    getCustomPages(),
  ]);
  return [
    ...STATIC_ROUTES.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.7,
    })),
    ...services.map((s) => ({
      url: absoluteUrl(`/services/${s.slug}`),
      lastModified: s.updated_at,
      images: s.cover ? [absoluteUrl(s.cover.url)] : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...projects.map((p) => ({
      url: absoluteUrl(`/projects/${p.slug}`),
      lastModified: p.updated_at,
      images: p.cover ? [absoluteUrl(p.cover.url)] : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...pages.map((p) => ({
      url: absoluteUrl(`/${p.slug}`),
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...articles.items.map((a) => ({
      url: absoluteUrl(`/blog/${a.slug}`),
      lastModified: a.updated_at,
      images: a.cover ? [absoluteUrl(a.cover.url)] : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
