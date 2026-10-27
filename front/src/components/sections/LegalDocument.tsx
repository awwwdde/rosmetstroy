import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LightHero } from "@/components/sections/PageHero";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { getPage, getSiteSettings } from "@/services/content";
import type { PrivacySections } from "@/types/content";

/** Юридические документы из CMS: политика обработки ПД, согласие на обработку ПД. */
export async function legalMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<PrivacySections>(slug), getSiteSettings()]);
  return buildMetadata(site, {
    path: `/${slug}`,
    title: page?.seo_title || fallbackTitle,
    description: page?.seo_description,
  });
}

export async function LegalDocument({ slug }: { slug: string }) {
  const page = await getPage<PrivacySections>(slug);
  if (!page || !page.is_published) notFound();
  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: page.sections.hero.title, href: `/${slug}` },
        ]}
        title={<span className="text-[clamp(34px,5vw,72px)] text-balance">{page.sections.hero.title}</span>}
        text={`Редакция от ${formatDate(page.updated_at)}`}
      />
      <section className="bg-paper pt-12 pb-[clamp(72px,9vw,130px)]">
        <div className="container-site">
          <div
            className="prose-rms max-w-[880px]"
            // HTML очищается на сервере (nh3) при сохранении в CMS
            dangerouslySetInnerHTML={{ __html: page.body_html }}
          />
        </div>
      </section>
    </>
  );
}
