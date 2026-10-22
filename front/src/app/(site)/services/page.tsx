import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { BandCta } from "@/components/sections/BandCta";
import { LightHero } from "@/components/sections/PageHero";
import { MediaImage } from "@/components/ui/MediaImage";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata, itemListJsonLd, webPageJsonLd } from "@/lib/seo";
import { getPage, getServices, getSiteSettings } from "@/services/content";
import type { ServiceCard, ServicesSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<ServicesSections>("services"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/services",
    title: page?.seo_title || "Услуги",
    description: page?.seo_description,
  });
}

function groupServices(services: ServiceCard[], order: string[]) {
  const groups = new Map<string, ServiceCard[]>();
  for (const title of order) groups.set(title, []);
  for (const service of services) {
    const key = service.menu_group || "Другое";
    groups.set(key, [...(groups.get(key) ?? []), service]);
  }
  return [...groups.entries()].filter(([, items]) => items.length);
}

async function ServicesContent() {
  const [page, services, site] = await Promise.all([
    getPage<ServicesSections>("services"),
    getServices(),
    getSiteSettings(),
  ]);
  if (!page) notFound();
  const notes = new Map(site.menu_groups.map((g) => [g.title, g.note]));
  const groups = groupServices(
    services,
    site.menu_groups.map((g) => g.title),
  );
  const s = page.sections;

  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Услуги", href: "/services" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
      />
      <section className="bg-paper pt-14 pb-[clamp(72px,9vw,130px)]">
        <div className="container-site flex flex-col gap-16">
          {groups.map(([title, items], groupIndex) => (
            <div key={title} className="flex flex-col gap-6">
              <Reveal className="flex flex-wrap items-baseline justify-between gap-4 border-t border-navy-950 pt-6">
                <h2 className="m-0 text-[28px] font-semibold tracking-[-.02em] text-navy-950">{title}</h2>
                {notes.get(title) ? (
                  <p className="m-0 max-w-[520px] text-[15px] leading-normal text-muted">{notes.get(title)}</p>
                ) : null}
              </Reveal>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-4">
                {items.map((service, index) => (
                  <Reveal key={service.id}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group relative block h-[clamp(300px,26vw,400px)] overflow-hidden rounded-[6px] bg-navy-800 text-white no-underline hover:text-white"
                    >
                      <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.04]">
                        <MediaImage
                          src={service.cover?.url}
                          alt={service.cover?.alt || service.title}
                          sizes="(min-width: 1100px) 33vw, 100vw"
                          priority={groupIndex === 0 && index < 2}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,29,54,0)_35%,rgba(7,29,54,.88)_100%)]" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-7">
                        <div className="flex flex-col gap-2">
                          <h3 className="m-0 text-[clamp(22px,1.9vw,28px)] leading-[1.1] font-semibold tracking-[-.02em] text-balance">
                            {service.title}
                          </h3>
                          <span className="text-[15px] leading-[1.45] text-white/75">{service.subtitle}</span>
                        </div>
                        <span
                          aria-hidden="true"
                          className="flex size-12 flex-none items-center justify-center rounded-[4px] border border-white/40 transition-colors group-hover:border-accent group-hover:bg-accent"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <BandCta title={s.cta.title} text={s.cta.text} label={s.cta.label} href="/request" />
      <JsonLd
        data={webPageJsonLd({
          path: "/services",
          name: page.seo_title || page.title,
          description: page.seo_description,
          type: "CollectionPage",
          dateModified: page.updated_at,
          extra: { mainEntity: itemListJsonLd(services.map((x) => ({ name: x.title, path: `/services/${x.slug}` }))) },
        })}
      />
    </>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ServicesContent />
    </Suspense>
  );
}
