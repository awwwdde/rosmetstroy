import type { Metadata } from "next";

import type { ServiceCard, SiteSettings } from "@/types/content";

// PUBLIC_SITE_URL читается при запуске сервера (его задаёт платформа деплоя, образ собирается
// без знания домена); NEXT_PUBLIC_SITE_URL подставляется на этапе сборки и остаётся запасным.
export const SITE_URL = (
  process.env.PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/*
 * Узлы schema.org связаны через @id: организация и сайт описаны один раз (в SiteChrome),
 * а страницы, услуги и статьи ссылаются на них. Так поисковики и нейросети собирают
 * единый граф знаний о компании, а не набор разрозненных фрагментов.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
const LANGUAGE = "ru-RU";

const OG_IMAGE_SIZE = { width: 1200, height: 630 };

type SeoInput = {
  path: string;
  title: string;
  description?: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noindex?: boolean;
  /** Заголовок без шаблона «%s — Росметстрой» */
  absoluteTitle?: boolean;
};

export function buildMetadata(site: SiteSettings | null, input: SeoInput): Metadata {
  const description = input.description || site?.seo.default_description || "";
  const image = input.image || site?.seo.og_image_url;
  const images = image ? [{ url: absoluteUrl(image), ...OG_IMAGE_SIZE, alt: input.title }] : undefined;
  const seo = site?.seo;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: { canonical: absoluteUrl(input.path) },
    robots: input.noindex
      ? { index: false, follow: false }
      : // Разрешаем поисковикам и нейросетям показывать крупные превью и длинные цитаты
        { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    openGraph: {
      type: input.type ?? "website",
      locale: "ru_RU",
      url: absoluteUrl(input.path),
      siteName: site?.company_name ?? "Росметстрой",
      title: input.title,
      description,
      images,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: input.title, description, images: images?.map((i) => i.url) },
    verification: {
      google: seo?.google_verification || undefined,
      yandex: seo?.yandex_verification || undefined,
      other: seo?.bing_verification ? { "msvalidate.01": seo.bing_verification } : undefined,
    },
  };
}

const filled = (requisites: SiteSettings["requisites"], key: string) =>
  requisites?.find((r) => r.k.trim().toLowerCase() === key.toLowerCase())?.v.trim() || undefined;

/** Организация и сайт — общий граф для всех страниц. */
export function siteGraphJsonLd(site: SiteSettings, services: ServiceCard[]) {
  const ownServices = services.filter((s) => !s.is_partner);
  const inn = filled(site.requisites, "ИНН");
  const ogrn = filled(site.requisites, "ОГРН");
  const areaServed = site.seo.area_served?.trim();

  const organization = {
    "@type": "GeneralContractor",
    "@id": ORG_ID,
    name: site.company_name,
    legalName: site.legal_name || undefined,
    alternateName: "Rosmetstroy",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: absoluteUrl(site.logo_url || "/brand/logo-square.png") },
    image: site.seo.og_image_url ? absoluteUrl(site.seo.og_image_url) : undefined,
    description: site.seo.default_description || site.footer_text,
    telephone: site.phone_href || undefined,
    email: site.email || undefined,
    address: site.address ? { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "RU" } : undefined,
    areaServed: areaServed || undefined,
    taxID: inn,
    identifier: ogrn ? { "@type": "PropertyValue", propertyID: "ОГРН", value: ogrn } : undefined,
    contactPoint:
      site.phone_href || site.email
        ? {
            "@type": "ContactPoint",
            contactType: "sales",
            telephone: site.phone_href || undefined,
            email: site.email || undefined,
            availableLanguage: "ru",
            areaServed: areaServed || "RU",
          }
        : undefined,
    // Направления работы — то, о чём компания может «рассказать» поисковику и нейросети
    knowsAbout: [...new Set([...site.menu_groups.map((g) => g.title), ...ownServices.map((s) => s.title)])].filter(
      (t) => t && t !== "Партнёр",
    ),
    // Партнёрские услуги (IT) оказывает другая компания — в каталог организации они не входят
    hasOfferCatalog: ownServices.length
      ? {
          "@type": "OfferCatalog",
          name: "Услуги",
          itemListElement: ownServices.map((s) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": `${absoluteUrl(`/services/${s.slug}`)}#service`,
              name: s.title,
              url: absoluteUrl(`/services/${s.slug}`),
            },
          })),
        }
      : undefined,
    sameAs: site.socials.map((s) => s.href).filter((href) => /^https?:\/\//.test(href)),
  };

  const website = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: site.company_name,
    alternateName: site.legal_name || undefined,
    description: site.seo.default_description || undefined,
    inLanguage: LANGUAGE,
    publisher: { "@id": ORG_ID },
  };

  // Главное меню — подсказка поисковикам для «быстрых ссылок» под сниппетом
  const navigation = {
    "@type": "ItemList",
    "@id": `${SITE_URL}/#navigation`,
    name: "Основные разделы сайта",
    itemListElement: site.nav.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.label,
      url: absoluteUrl(item.href),
    })),
  };

  return { "@context": "https://schema.org", "@graph": [organization, website, navigation] };
}

type WebPageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage" | "FAQPage";

/** Описание конкретной страницы с привязкой к сайту и организации. */
export function webPageJsonLd(input: {
  path: string;
  name: string;
  description?: string;
  type?: WebPageType;
  dateModified?: string | null;
  image?: string | null;
  /** Дополнительные свойства (например, mainEntity) */
  extra?: Record<string, unknown>;
}) {
  const url = absoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description || undefined,
    inLanguage: LANGUAGE,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    dateModified: input.dateModified || undefined,
    primaryImageOfPage: input.image ? { "@type": "ImageObject", url: absoluteUrl(input.image) } : undefined,
    ...input.extra,
  };
}

/** Список ссылок (каталог услуг, проектов, статей) для CollectionPage. */
export function itemListJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

/** Текст из HTML для описаний и llms.txt: без тегов, сущностей и лишних пробелов. */
export function plainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|h[1-6]|li|div|br|tr)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
