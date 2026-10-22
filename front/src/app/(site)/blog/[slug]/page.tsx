import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageFallback } from "@/components/layout/PageFallback";
import { BandCta } from "@/components/sections/BandCta";
import { JsonLd } from "@/components/ui/JsonLd";
import { MediaImage } from "@/components/ui/MediaImage";
import { ORG_ID, WEBSITE_ID, absoluteUrl, buildMetadata, plainText } from "@/lib/seo";
import { formatDate, plural } from "@/lib/utils";
import { PLACEHOLDER_SLUG, getArticle, getSiteSettings, staticSlugs } from "@/services/content";

export function generateStaticParams() {
  return staticSlugs("articles");
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [article, site] = await Promise.all([getArticle(slug), getSiteSettings()]);
  if (!article) return { title: "Статья не найдена", robots: { index: false } };
  return buildMetadata(site, {
    path: `/blog/${article.slug}`,
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt,
    image: article.cover?.url,
    type: "article",
    publishedTime: article.published_at,
    modifiedTime: article.updated_at,
  });
}

async function ArticleContent({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) notFound();
  const [article, site] = await Promise.all([getArticle(slug), getSiteSettings()]);
  if (!article) notFound();

  const url = absoluteUrl(`/blog/${article.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: article.title,
    description: article.excerpt,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    image: article.cover ? [absoluteUrl(article.cover.url)] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "ru-RU",
    wordCount: plainText(article.body_html).split(/\s+/).filter(Boolean).length,
    timeRequired: article.reading_minutes ? `PT${article.reading_minutes}M` : undefined,
    articleSection: "Блог",
    isPartOf: { "@id": WEBSITE_ID },
    author: { "@id": ORG_ID, name: site.legal_name || site.company_name },
    publisher: { "@id": ORG_ID, name: site.legal_name || site.company_name },
  };

  return (
    <>
      <article className="bg-paper pt-[150px] pb-[clamp(72px,9vw,130px)]">
        <div className="container-site flex flex-col gap-12">
          <Breadcrumbs
            items={[
              { name: "Главная", href: "/" },
              { name: "Блог", href: "/blog" },
              { name: article.title, href: `/blog/${article.slug}` },
            ]}
          />
          <header className="flex max-w-[960px] flex-col gap-6">
            <span className="text-[13px] text-accent-dark">
              {formatDate(article.published_at)} · {article.reading_minutes}{" "}
              {plural(article.reading_minutes, ["минута", "минуты", "минут"])} чтения
            </span>
            <h1 className="m-0 text-[clamp(38px,5vw,72px)] leading-[1.02] font-semibold tracking-[-.035em] text-balance text-navy-950">
              {article.title}
            </h1>
            {article.excerpt ? (
              <p className="m-0 text-lg leading-relaxed text-pretty text-muted">{article.excerpt}</p>
            ) : null}
          </header>
          {article.cover ? (
            <div className="relative h-[clamp(300px,42vw,620px)] overflow-hidden rounded-[6px]">
              <MediaImage
                src={article.cover.url}
                alt={article.cover.alt || article.title}
                sizes="(min-width: 1440px) 1344px, 100vw"
                priority
              />
            </div>
          ) : null}
          <div
            className="prose-rms max-w-[760px]"
            // HTML очищается на сервере (nh3) при сохранении в CMS
            dangerouslySetInnerHTML={{ __html: article.body_html }}
          />
          <Link href="/blog" className="self-start font-medium no-underline">
            ← Все статьи
          </Link>
        </div>
      </article>
      <BandCta title="Есть проект? Обсудим техническую задачу." label="Отправить на расчёт" href="/request" />
      <JsonLd data={jsonLd} />
    </>
  );
}

export default function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
