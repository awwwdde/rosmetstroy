import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { LightHero } from "@/components/sections/PageHero";
import { MediaImage } from "@/components/ui/MediaImage";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, itemListJsonLd, webPageJsonLd } from "@/lib/seo";
import { formatDate, plural } from "@/lib/utils";
import { getArticles, getPage, getSiteSettings } from "@/services/content";
import type { BlogSections } from "@/types/content";

const PAGE_SIZE = 12;

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<BlogSections>("blog"), getSiteSettings()]);
  return buildMetadata(site, { path: "/blog", title: page?.seo_title || "Блог", description: page?.seo_description });
}

async function ArticleList({ searchParams }: { searchParams: PageProps<"/blog">["searchParams"] }) {
  const sp = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const [page, articles] = await Promise.all([getPage<BlogSections>("blog"), getArticles(pageNumber, PAGE_SIZE)]);
  const pages = Math.max(1, Math.ceil(articles.total / PAGE_SIZE));

  if (!articles.items.length) {
    return <p className="m-0 py-20 text-lg text-muted">{page?.sections.empty.text ?? "Статьи скоро появятся."}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-x-4 gap-y-12">
        {articles.items.map((article, index) => (
          <Reveal as="article" key={article.id}>
            <Link
              href={`/blog/${article.slug}`}
              className="group flex flex-col gap-4 text-navy-950 no-underline hover:text-navy-950"
            >
              <div className="relative h-[clamp(240px,22vw,320px)] overflow-hidden rounded-[6px]">
                <div className="absolute inset-0 transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04]">
                  <MediaImage
                    src={article.cover?.url}
                    alt={article.cover?.alt || article.title}
                    sizes="(min-width: 1100px) 33vw, 100vw"
                    priority={index < 2}
                  />
                </div>
              </div>
              <span className="text-[13px] text-accent-dark">
                {formatDate(article.published_at)} · {article.reading_minutes}{" "}
                {plural(article.reading_minutes, ["минута", "минуты", "минут"])}
              </span>
              <h2 className="m-0 text-[clamp(22px,1.8vw,26px)] leading-[1.15] font-semibold tracking-[-.015em] text-balance group-hover:text-accent">
                {article.title}
              </h2>
              {article.excerpt ? <p className="m-0 text-[15px] leading-relaxed text-muted">{article.excerpt}</p> : null}
            </Link>
          </Reveal>
        ))}
      </div>
      {pages > 1 ? (
        <nav aria-label="Страницы блога" className="flex flex-wrap gap-2 border-t border-line pt-8">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={n === 1 ? "/blog" : `/blog?page=${n}`}
              aria-current={n === pageNumber ? "page" : undefined}
              className={
                n === pageNumber
                  ? "flex size-11 items-center justify-center rounded-[4px] bg-navy-950 text-white no-underline hover:text-white"
                  : "flex size-11 items-center justify-center rounded-[4px] border border-line text-navy-950 no-underline hover:border-navy-950"
              }
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
      <JsonLd
        data={webPageJsonLd({
          path: "/blog",
          name: page?.seo_title || page?.title || "Блог",
          description: page?.seo_description,
          type: "CollectionPage",
          extra: {
            mainEntity: itemListJsonLd(articles.items.map((x) => ({ name: x.title, path: `/blog/${x.slug}` }))),
          },
        })}
      />
    </>
  );
}

async function BlogHero() {
  const page = await getPage<BlogSections>("blog");
  if (!page) notFound();
  return (
    <LightHero
      crumbs={[
        { name: "Главная", href: "/" },
        { name: "Блог", href: "/blog" },
      ]}
      title={page.sections.hero.title}
      text={page.sections.hero.text}
    />
  );
}

export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <>
      <Suspense fallback={<div className="h-[420px] bg-paper" />}>
        <BlogHero />
      </Suspense>
      <section className="bg-paper pt-16 pb-[clamp(80px,10vw,140px)]">
        <div className="container-site flex flex-col gap-12">
          <Suspense fallback={<PageFallback />}>
            <ArticleList searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
