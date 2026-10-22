import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { CtaSection } from "@/components/sections/CtaSection";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { ImageHero } from "@/components/sections/PageHero";
import { ProductionRoute } from "@/components/sections/ProductionRoute";
import { MediaImage } from "@/components/ui/MediaImage";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { shown } from "@/lib/utils";
import { getPage, getSiteSettings } from "@/services/content";
import type { MetalworkSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<MetalworkSections>("metalwork"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/metalwork",
    title: page?.seo_title || "Работа с металлом",
    description: page?.seo_description,
    image: page?.og_image_url || null,
  });
}

async function MetalworkContent() {
  const [page, site] = await Promise.all([getPage<MetalworkSections>("metalwork"), getSiteSettings()]);
  if (!page) notFound();
  const s = page.sections;
  return (
    <>
      <ImageHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: s.hero.title, href: "/metalwork" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
        image={s.hero.image}
        imageAlt={s.hero.image_alt || s.hero.title}
      />
      {shown(s.services) ? <FeatureGrid id="metal-services" data={s.services} tone="white" /> : null}
      {shown(s.route) ? (
        <ProductionRoute id="route" title={s.route.title} text={s.route.text} steps={s.route.steps} />
      ) : null}
      {shown(s.quality) ? <FeatureGrid id="quality" data={s.quality} tone="white" /> : null}

      {shown(s.gallery) && s.gallery.images.length ? (
        <section aria-labelledby="gallery-title" className="bg-paper section-y-sm">
          <div className="container-site flex flex-col gap-10">
            <h2 id="gallery-title" className="m-0 heading-2-sm text-navy-950">
              {s.gallery.title}
            </h2>
            <div className="grid auto-rows-[300px] grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
              {s.gallery.images.map((img, i) => (
                <Reveal
                  key={img.url}
                  className={
                    i === 0
                      ? "relative col-span-full h-[clamp(300px,45vw,640px)] overflow-hidden rounded-[6px]"
                      : "relative overflow-hidden rounded-[6px]"
                  }
                >
                  <MediaImage
                    src={img.url}
                    alt={img.alt}
                    sizes={i === 0 ? "100vw" : "(min-width: 900px) 33vw, 100vw"}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {shown(s.cta) ? <CtaSection data={s.cta} site={site} /> : null}
      <JsonLd
        data={webPageJsonLd({
          path: "/metalwork",
          name: page.seo_title || page.title,
          description: page.seo_description,
          dateModified: page.updated_at,
        })}
      />
    </>
  );
}

export default function MetalworkPage() {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <MetalworkContent />
    </Suspense>
  );
}
