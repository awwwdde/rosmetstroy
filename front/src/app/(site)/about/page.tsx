import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { AboutIntro } from "@/components/sections/AboutIntro";
import { CtaSection } from "@/components/sections/CtaSection";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { Highlights } from "@/components/sections/Highlights";
import { ImageHero } from "@/components/sections/PageHero";
import { Requisites } from "@/components/sections/Requisites";
import { TextBlock } from "@/components/sections/TextBlock";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { shown } from "@/lib/utils";
import { getPage, getSiteSettings } from "@/services/content";
import type { AboutSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<AboutSections>("about"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/about",
    title: page?.seo_title || "О компании",
    description: page?.seo_description,
    image: page?.og_image_url || null,
  });
}

async function AboutContent() {
  const [page, site] = await Promise.all([getPage<AboutSections>("about"), getSiteSettings()]);
  if (!page) notFound();
  const s = page.sections;
  return (
    <>
      <ImageHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "О компании", href: "/about" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
        image={s.hero.image}
        imageAlt={s.hero.image_alt || s.hero.title}
      />
      {shown(s.profile) ? <AboutIntro id="profile" data={s.profile} /> : null}
      <Highlights items={site.highlights} />
      {shown(s.competencies) ? <FeatureGrid id="competencies" data={s.competencies} tone="paper" /> : null}
      {shown(s.approach) ? <FeatureGrid id="approach" data={s.approach} tone="white" /> : null}
      {shown(s.contractors) ? (
        <TextBlock
          id="contractors"
          tone="dark"
          title={s.contractors.title}
          paragraphs={s.contractors.paragraphs.map((p) => p.text)}
        />
      ) : null}
      {shown(s.control) ? <FeatureGrid id="control" data={s.control} tone="white" /> : null}
      {shown(s.partners) ? (
        <TextBlock
          id="partners"
          tone="paper"
          title={s.partners.title}
          paragraphs={[s.partners.text]}
          link={{ label: s.partners.link_label, href: s.partners.link_href }}
        />
      ) : null}
      {shown(s.documents) ? <Requisites title={s.documents.title} text={s.documents.text} site={site} /> : null}
      {shown(s.cta) ? <CtaSection data={s.cta} site={site} /> : null}
      <JsonLd
        data={webPageJsonLd({
          path: "/about",
          name: page.seo_title || page.title,
          description: page.seo_description || site.seo.default_description,
          type: "AboutPage",
          dateModified: page.updated_at,
        })}
      />
    </>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <AboutContent />
    </Suspense>
  );
}
