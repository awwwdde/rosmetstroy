import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ApiUnavailableError, apiGet } from "@/lib/server-api";
import type {
  Article,
  ArticleCard,
  Category,
  Faq,
  Page,
  Paginated,
  ProjectCard,
  ProjectDetail,
  Service,
  ServiceCard,
  SiteSettings,
} from "@/types/content";

export const LOCALE = "ru";

export type CacheTag = "pages" | "services" | "projects" | "articles" | "faq" | "settings";

type Loaded<T> = { ok: true; data: T | null } | { ok: false; data: null };

/**
 * Кэшируемая загрузка из API (ISR через Cache Components).
 * Данные живут в кэше часами и сбрасываются по тегу при сохранении в CMS.
 * Если API недоступен (например, во время docker build), результат кэшируется
 * на секунды — Next.js исключает его из пререндера и дочитывает при запросе.
 */
async function load<T>(tag: CacheTag, path: string): Promise<Loaded<T>> {
  "use cache";
  cacheTag(tag);
  try {
    const data = await apiGet<T>(path);
    // В разработке кэш короткий: изменения из CMS видны сразу, даже если хук инвалидации
    // настроен на другой адрес. В production данные живут часами и сбрасываются по тегу.
    if (process.env.NODE_ENV === "development") cacheLife("seconds");
    else cacheLife("hours");
    return { ok: true, data };
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) throw error;
    cacheLife("seconds");
    return { ok: false, data: null };
  }
}

async function required<T>(tag: CacheTag, path: string): Promise<T | null> {
  const result = await load<T>(tag, path);
  if (!result.ok) throw new ApiUnavailableError(`Не удалось загрузить ${path}`);
  return result.data;
}

const withLocale = (path: string) => `${path}${path.includes("?") ? "&" : "?"}locale=${LOCALE}`;

export async function getSiteSettings(): Promise<SiteSettings> {
  const setting = await required<{ value: SiteSettings }>("settings", withLocale("/settings/site"));
  if (!setting) throw new ApiUnavailableError("Настройки сайта не найдены");
  return setting.value;
}

export function getPage<S>(slug: string): Promise<Page<S> | null> {
  return required<Page<S>>("pages", withLocale(`/pages/${slug}`));
}

export async function getServices(): Promise<ServiceCard[]> {
  return (await required<ServiceCard[]>("services", withLocale("/services"))) ?? [];
}

export function getService(slug: string): Promise<Service | null> {
  return required<Service>("services", withLocale(`/services/${encodeURIComponent(slug)}`));
}

export async function getProjects(params: { category?: string; featured?: boolean } = {}): Promise<ProjectCard[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  const qs = query.toString();
  return (await required<ProjectCard[]>("projects", withLocale(`/projects${qs ? `?${qs}` : ""}`))) ?? [];
}

export function getProject(slug: string): Promise<ProjectDetail | null> {
  return required<ProjectDetail>("projects", withLocale(`/projects/${encodeURIComponent(slug)}`));
}

export async function getCategories(): Promise<Category[]> {
  return (await required<Category[]>("projects", withLocale("/categories"))) ?? [];
}

export async function getArticles(page = 1, pageSize = 12): Promise<Paginated<ArticleCard>> {
  const data = await required<Paginated<ArticleCard>>(
    "articles",
    withLocale(`/articles?page=${page}&page_size=${pageSize}`),
  );
  return data ?? { items: [], total: 0, page, page_size: pageSize };
}

export function getArticle(slug: string): Promise<Article | null> {
  return required<Article>("articles", withLocale(`/articles/${encodeURIComponent(slug)}`));
}

export async function getCustomPages(): Promise<{ slug: string; title: string; updated_at: string }[]> {
  return (await required<{ slug: string; title: string; updated_at: string }[]>("pages", withLocale("/pages"))) ?? [];
}

export async function getFaq(): Promise<Faq[]> {
  return (await required<Faq[]>("faq", withLocale("/faq"))) ?? [];
}

/** Список slug-ов для generateStaticParams; при недоступном API — плейсхолдер (требование Cache Components). */
export async function staticSlugs(kind: "services" | "projects" | "articles" | "pages"): Promise<{ slug: string }[]> {
  let items: { slug: string }[] = [];
  try {
    if (kind === "articles") {
      items = (await apiGet<Paginated<ArticleCard>>(withLocale("/articles?page=1&page_size=50")))?.items ?? [];
    } else {
      items = (await apiGet<{ slug: string }[]>(withLocale(`/${kind}`))) ?? [];
    }
  } catch (error) {
    if (!(error instanceof ApiUnavailableError)) throw error;
  }
  return items.length ? items.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER_SLUG }];
}

export const PLACEHOLDER_SLUG = "__placeholder__";
