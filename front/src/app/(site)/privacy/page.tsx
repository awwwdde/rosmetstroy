import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { LightHero } from "@/components/sections/PageHero";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { getPage, getSiteSettings } from "@/services/content";
import type { PrivacySections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<PrivacySections>("privacy"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/privacy",
    title: page?.seo_title || "Политика конфиденциальности",
    description: page?.seo_description,
  });
}

async function PrivacyContent() {
  const page = await getPage<PrivacySections>("privacy");
  if (!page) notFound();
  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: page.sections.hero.title, href: "/privacy" },
        ]}
        title={<span className="text-[clamp(38px,5vw,72px)]">{page.sections.hero.title}</span>}
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

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PrivacyContent />
    </Suspense>
  );
}
