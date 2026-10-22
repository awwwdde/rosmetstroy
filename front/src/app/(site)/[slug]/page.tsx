import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { LightHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { PLACEHOLDER_SLUG, getPage, getSiteSettings, staticSlugs } from "@/services/content";
import type { PageHero } from "@/types/content";

/*
 * Страницы, созданные в CMS («Страницы → Создать страницу»), открываются по адресу /slug.
 * Разделы сайта (/about, /services и т. д.) — статические маршруты и имеют приоритет над этим.
 */

type CustomSections = { hero: PageHero };

export function generateStaticParams() {
  return staticSlugs("pages");
}

async function loadCustomPage(slug: string) {
  if (slug === PLACEHOLDER_SLUG) return null;
  const page = await getPage<CustomSections>(slug);
  // Системные страницы (home, request и т. д.) по этому адресу не открываются
  return page && page.template === "custom" ? page : null;
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [page, site] = await Promise.all([loadCustomPage(slug), getSiteSettings()]);
  if (!page) return { title: "Страница не найдена", robots: { index: false } };
  return buildMetadata(site, {
    path: `/${page.slug}`,
    title: page.seo_title || page.title,
    description: page.seo_description || page.sections.hero?.text,
    image: page.og_image_url || null,
  });
}

async function CustomPageContent({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const { slug } = await params;
  const page = await loadCustomPage(slug);
  if (!page) notFound();
  const hero = page.sections.hero ?? { title: page.title };

  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: hero.title || page.title, href: `/${page.slug}` },
        ]}
        title={hero.title || page.title}
        text={hero.text}
      />
      {page.body_html ? (
        <section className="bg-paper pt-12 pb-[clamp(72px,9vw,130px)]">
          <div className="container-site">
            <div
              className="prose-rms max-w-[880px]"
              // HTML очищается на сервере (nh3) при сохранении в CMS
              dangerouslySetInnerHTML={{ __html: page.body_html }}
            />
          </div>
        </section>
      ) : (
        <div className="bg-paper pb-[clamp(72px,9vw,130px)]" />
      )}
      <JsonLd
        data={webPageJsonLd({
          path: `/${page.slug}`,
          name: page.seo_title || page.title,
          description: page.seo_description || hero.text,
          dateModified: page.updated_at,
        })}
      />
    </>
  );
}

export default function CustomPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <CustomPageContent params={params} />
    </Suspense>
  );
}
