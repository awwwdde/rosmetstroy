import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { AboutIntro } from "@/components/sections/AboutIntro";
import { CtaSection } from "@/components/sections/CtaSection";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { Highlights } from "@/components/sections/Highlights";
import { Reasons } from "@/components/sections/Reasons";
import { Directions } from "@/components/sections/home/Directions";
import { FeaturedProjects } from "@/components/sections/home/FeaturedProjects";
import { HomeFaq } from "@/components/sections/home/HomeFaq";
import { HomeHero } from "@/components/sections/home/HomeHero";
import { ItPartner } from "@/components/sections/home/ItPartner";
import { WorkProcess } from "@/components/sections/home/WorkProcess";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { shown } from "@/lib/utils";
import { getFaq, getPage, getProjects, getSiteSettings } from "@/services/content";
import type { HomeSections } from "@/types/content";
import { labelsOf } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<HomeSections>("home"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/",
    title: page?.seo_title || site.seo.default_title,
    description: page?.seo_description,
    image: page?.og_image_url || null,
    absoluteTitle: true,
  });
}

async function HomeContent() {
  const [page, site, featured, faq] = await Promise.all([
    getPage<HomeSections>("home"),
    getSiteSettings(),
    getProjects({ featured: true }),
    getFaq(),
  ]);
  if (!page) notFound();
  const s = page.sections;
  const generalFaq = faq.filter((f) => f.service_id === null).slice(0, 5);

  return (
    <>
      <HomeHero data={s.hero} />
      {shown(s.about) ? <AboutIntro data={s.about} /> : null}
      <Highlights items={site.highlights} />
      {shown(s.directions) ? <Directions data={s.directions} mainLabel={labelsOf(site).direction_main} /> : null}
      {shown(s.tasks) ? <FeatureGrid id="tasks" data={s.tasks} tone="white" /> : null}
      {shown(s.projects) ? <FeaturedProjects data={s.projects} projects={featured} /> : null}
      {shown(s.process) ? <WorkProcess data={s.process} /> : null}
      {shown(s.reasons) ? <Reasons data={s.reasons} /> : null}
      {shown(s.it) ? <ItPartner data={s.it} partner={site.partner} /> : null}
      {shown(s.faq) ? <HomeFaq data={s.faq} items={generalFaq} /> : null}
      {shown(s.cta) ? <CtaSection data={s.cta} site={site} /> : null}
      <JsonLd
        data={webPageJsonLd({
          path: "/",
          name: page.seo_title || site.seo.default_title,
          description: page.seo_description || site.seo.default_description,
          dateModified: page.updated_at,
        })}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <HomeContent />
    </Suspense>
  );
}
