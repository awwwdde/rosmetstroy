import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { BandCta } from "@/components/sections/BandCta";
import { LightHero } from "@/components/sections/PageHero";
import { Accordion } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/ui/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { getFaq, getPage, getServices, getSiteSettings } from "@/services/content";
import type { FaqSections } from "@/types/content";

export async function generateMetadata(): Promise<Metadata> {
  const [page, site] = await Promise.all([getPage<FaqSections>("faq"), getSiteSettings()]);
  return buildMetadata(site, {
    path: "/faq",
    title: page?.seo_title || "Вопросы и ответы",
    description: page?.seo_description,
  });
}

async function FaqContent() {
  const [page, faq, services] = await Promise.all([getPage<FaqSections>("faq"), getFaq(), getServices()]);
  if (!page) notFound();

  const general = faq.filter((f) => f.service_id === null);
  const byService = services
    .map((service) => ({ service, items: faq.filter((f) => f.service_id === service.id) }))
    .filter((group) => group.items.length);
  const groups = [
    ...(general.length ? [{ title: page.sections.general_title, items: general }] : []),
    ...byService.map((g) => ({ title: g.service.title, items: g.items })),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Вопросы и ответы", href: "/faq" },
        ]}
        title={page.sections.hero.title}
        text={page.sections.hero.text}
      />
      <section className="bg-paper pt-16 pb-[clamp(72px,9vw,130px)]">
        <div className="container-site flex flex-col gap-16">
          {groups.map((group, index) => (
            <div
              key={group.title}
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-8"
            >
              <h2 className="m-0 text-[clamp(26px,2.6vw,36px)] leading-[1.1] font-semibold tracking-[-.02em] text-navy-950">
                {group.title}
              </h2>
              <Accordion
                defaultOpen={index === 0 ? 0 : -1}
                items={group.items.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))}
              />
            </div>
          ))}
        </div>
      </section>
      <BandCta title="Не нашли ответ? Задайте вопрос инженеру." label="Отправить вопрос" href="/request" />
      {faq.length ? <JsonLd data={jsonLd} /> : null}
    </>
  );
}

export default function FaqPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <FaqContent />
    </Suspense>
  );
}
