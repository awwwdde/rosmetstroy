import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { CtaSection } from "@/components/sections/CtaSection";
import { LightHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { InfoBlocks } from "@/components/ui/InfoBlocks";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";
import { shown } from "@/lib/utils";
import { getPage, getSiteSettings } from "@/services/content";
import type { ContactsSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<ContactsSections>("contacts"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/contacts",
    title: page?.seo_title || "Контакты",
    description: page?.seo_description,
  });
}

// Разрешаем встраивать только карты Яндекса и Google — URL задаётся в CMS
const MAP_HOSTS = ["yandex.ru", "yandex.com", "www.google.com", "google.com"];

function safeMapUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      MAP_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

async function ContactsContent() {
  const [page, site] = await Promise.all([getPage<ContactsSections>("contacts"), getSiteSettings()]);
  if (!page) notFound();
  const s = page.sections;
  const mapUrl = shown(s.map) && s.map.embed_url ? safeMapUrl(s.map.embed_url) : null;

  const rows = [
    { k: "Телефон", v: site.phone, href: `tel:${site.phone_href}` },
    { k: "Эл. почта", v: site.email, href: `mailto:${site.email}` },
    { k: "Адрес", v: site.address },
    { k: "Режим работы", v: site.work_hours },
  ].filter((r) => r.v);

  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Контакты", href: "/contacts" },
        ]}
        title={s.hero.title}
        text={s.hero.text}
      />
      <section className="bg-paper pt-16 pb-[clamp(72px,9vw,130px)]">
        <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-x-20 gap-y-12">
          <Reveal>
            <InfoBlocks
              size="lg"
              minWidth={260}
              items={rows.map((row) => ({
                key: row.k,
                label: row.k,
                value: row.href ? (
                  <a href={row.href} className="text-navy-950 no-underline hover:text-accent">
                    {row.v}
                  </a>
                ) : (
                  row.v
                ),
              }))}
            />
          </Reveal>
          <Reveal className="relative min-h-[420px] overflow-hidden rounded-[6px] bg-navy-800">
            {mapUrl ? (
              <iframe
                src={mapUrl}
                title={s.map.title || "Карта"}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 size-full border-0"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col justify-end gap-3 bg-[linear-gradient(135deg,#103d70_0%,#0a2747_100%)] p-8 text-white">
                <span className="text-[13px] text-sky">{s.map.title}</span>
                <span className="text-2xl font-semibold tracking-[-.015em]">{site.address}</span>
                <a
                  href={`https://yandex.ru/maps/?text=${encodeURIComponent(site.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start border-b border-accent pb-1 text-white no-underline hover:text-sky"
                >
                  Открыть в Яндекс Картах →
                </a>
              </div>
            )}
          </Reveal>
        </div>
      </section>
      {shown(s.cta) ? <CtaSection data={s.cta} site={site} /> : null}
      <JsonLd
        data={webPageJsonLd({
          path: "/contacts",
          name: page.seo_title || page.title,
          description: page.seo_description,
          type: "ContactPage",
          dateModified: page.updated_at,
        })}
      />
    </>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ContactsContent />
    </Suspense>
  );
}
