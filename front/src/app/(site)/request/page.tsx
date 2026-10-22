import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RequestForm } from "@/components/forms/RequestForm";
import { PageFallback } from "@/components/layout/PageFallback";
import { LightHero } from "@/components/sections/PageHero";
import { buildMetadata } from "@/lib/seo";
import { getPage, getServices, getSiteSettings } from "@/services/content";
import type { RequestSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<RequestSections>("request"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/request",
    title: page?.seo_title || "Заявка на расчёт",
    description: page?.seo_description,
  });
}

async function RequestContent() {
  const [page, services, site] = await Promise.all([
    getPage<RequestSections>("request"),
    getServices(),
    getSiteSettings(),
  ]);
  if (!page) notFound();
  const s = page.sections;
  const ids = new Map(services.map((svc) => [svc.slug, svc.id]));
  const directions = s.directions.map((d) => ({
    ...d,
    service_id: (d.service_slug && ids.get(d.service_slug)) || null,
  }));

  return (
    <div className="pb-[clamp(72px,9vw,130px)]">
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Заявка", href: "/request" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-0.5 overflow-hidden rounded-[6px] border border-line bg-line">
          <Suspense fallback={<div className="min-h-[640px] bg-white" />}>
            <RequestForm directions={directions} partnerNote={s.partner_note} success={s.success} email={site.email} />
          </Suspense>
          <aside className="flex flex-col justify-between gap-14 bg-navy-950 p-[clamp(24px,4vw,56px)] text-white">
            <div className="flex flex-col gap-8">
              <span className="text-[13px] text-sky">Что произойдёт дальше</span>
              <ol className="m-0 flex list-none flex-col p-0">
                {s.next_steps.map((step) => (
                  <li key={step.title} className="flex flex-col gap-1.5 border-t border-sky/18 py-[22px]">
                    <span className="text-lg font-semibold">{step.title}</span>
                    <span className="text-sm leading-[1.55] text-white/70">{step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-col gap-3.5 border-t border-sky/18 pt-7">
              <span className="text-[13px] text-sky">Напрямую</span>
              <a
                href={`tel:${site.phone_href}`}
                className="text-2xl font-semibold text-white no-underline hover:text-sky"
              >
                {site.phone}
              </a>
              <a href={`mailto:${site.email}`} className="text-base text-sky no-underline hover:text-white">
                {site.email}
              </a>
            </div>
          </aside>
        </div>
      </LightHero>
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <RequestContent />
    </Suspense>
  );
}
