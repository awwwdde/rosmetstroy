import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { BandCta } from "@/components/sections/BandCta";
import { DarkHero } from "@/components/sections/PageHero";
import { ProjectsGallery } from "@/components/sections/ProjectsGallery";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, itemListJsonLd, webPageJsonLd } from "@/lib/seo";
import { getCategories, getPage, getProjects, getSiteSettings } from "@/services/content";
import type { ProjectsSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<ProjectsSections>("projects"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/projects",
    title: page?.seo_title || "Проекты",
    description: page?.seo_description,
  });
}

async function ProjectsContent() {
  const [page, projects, categories] = await Promise.all([
    getPage<ProjectsSections>("projects"),
    getProjects(),
    getCategories(),
  ]);
  if (!page) notFound();
  const s = page.sections;
  return (
    <>
      <DarkHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Проекты", href: "/projects" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
      >
        <div />
      </DarkHero>
      <ProjectsGallery
        projects={projects}
        categories={categories}
        allLabel={s.hero.all_label}
        shownLabel={s.hero.shown_label}
        emptyText={s.empty?.text}
      />
      <BandCta title={s.cta.title} label={s.cta.label} href="/request" />
      <JsonLd
        data={webPageJsonLd({
          path: "/projects",
          name: page.seo_title || page.title,
          description: page.seo_description,
          type: "CollectionPage",
          dateModified: page.updated_at,
          extra: { mainEntity: itemListJsonLd(projects.map((x) => ({ name: x.title, path: `/projects/${x.slug}` }))) },
        })}
      />
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <ProjectsContent />
    </Suspense>
  );
}
