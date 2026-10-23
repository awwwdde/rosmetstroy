import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { BandCta } from "@/components/sections/BandCta";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { LightHero } from "@/components/sections/PageHero";
import { SectionIntro } from "@/components/sections/SectionIntro";
import { TextBlock } from "@/components/sections/TextBlock";
import { Accordion } from "@/components/ui/Accordion";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { JsonLd } from "@/components/ui/JsonLd";
import { MediaImage } from "@/components/ui/MediaImage";
import { SmartLink } from "@/components/ui/SmartLink";
import { InfoBlocks } from "@/components/ui/InfoBlocks";
import { ORG_ID, absoluteUrl, buildMetadata, webPageJsonLd } from "@/lib/seo";
import { PLACEHOLDER_SLUG, getService, getSiteSettings, staticSlugs } from "@/services/content";
import type { Service } from "@/types/content";

export function generateStaticParams() {
  return staticSlugs("services");
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [service, site] = await Promise.all([getService(slug), getSiteSettings()]);
  if (!service) return { title: "Услуга не найдена", robots: { index: false } };
  return buildMetadata(site, {
    path: `/services/${service.slug}`,
    title: service.seo_title || service.title,
    description: service.seo_description || service.summary,
    image: service.cover?.url,
    modifiedTime: service.updated_at,
  });
}

function serviceJsonLd(service: Service) {
  const faq = service.faq;
  const url = absoluteUrl(`/services/${service.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: service.title,
        serviceType: service.menu_group || service.title,
        description: service.summary || service.subtitle,
        url,
        image: service.cover ? absoluteUrl(service.cover.url) : undefined,
        // Партнёрские услуги (IT) оказывает партнёрская студия, а не компания
        provider: service.is_partner ? undefined : { "@id": ORG_ID },
        brand: service.is_partner ? undefined : { "@id": ORG_ID },
        areaServed: "RU",
        hasOfferCatalog: service.scope.length
          ? {
              "@type": "OfferCatalog",
              name: "Состав работ",
              itemListElement: service.scope.map((item) => ({
                "@type": "Offer",
                itemOffered: { "@type": "Service", name: item.title, description: item.description || undefined },
              })),
            }
          : undefined,
      },
      webPageJsonLd({
        path: `/services/${service.slug}`,
        name: service.seo_title || service.title,
        description: service.seo_description || service.summary,
        dateModified: service.updated_at,
        image: service.cover?.url,
        extra: { "@context": undefined, mainEntity: { "@id": `${url}#service` } },
      }),
      ...(faq.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${url}#faq`,
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            },
          ]
        : []),
    ],
  };
}

function Uses({ service }: { service: Service }) {
  if (!service.uses.length) return null;
  return (
    <section aria-labelledby="uses-title" className="bg-white section-y-sm">
      <div className="container-site flex flex-col gap-12">
        <SectionIntro id="uses-title" size="md" title={service.uses_title} text={service.uses_text} />
        <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t border-navy-950">
          {service.uses.map((use) => {
            const body = (
              <>
                <span className="text-2xl font-semibold tracking-[-.015em]">{use.title}</span>
                <span className="text-[15px] leading-normal text-muted">{use.description}</span>
              </>
            );
            const cls = "flex flex-col gap-3.5 border-b border-line pt-7 pr-6 pb-8 text-navy-950 no-underline";
            return use.href ? (
              <SmartLink
                key={use.title}
                href={use.href}
                className={`${cls} transition-[padding,background-color] duration-300 hover:bg-paper hover:pl-4 hover:text-navy-950`}
              >
                {body}
              </SmartLink>
            ) : (
              <div key={use.title} className={cls}>
                {body}
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

function Specs({ service }: { service: Service }) {
  if (!service.specs.length) return null;
  return (
    <section aria-labelledby="specs-title" className="bg-navy-950 section-y-sm text-white">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-x-20 gap-y-14">
        <Reveal className="flex flex-col gap-7">
          <h2 id="specs-title" className="m-0 heading-2-sm">
            Технические характеристики
          </h2>
          <div className="relative mt-3 h-[clamp(280px,30vw,440px)] overflow-hidden rounded-[6px]">
            <MediaImage
              src={service.tech_image?.url}
              alt={service.tech_image?.alt || `${service.title}: узел конструкции`}
              sizes="(min-width: 1100px) 600px, 100vw"
            />
          </div>
        </Reveal>
        <Reveal>
          <InfoBlocks
            tone="dark"
            minWidth={200}
            items={service.specs.map((spec) => ({ key: spec.k, label: spec.k, value: spec.v }))}
          />
        </Reveal>
      </div>
    </section>
  );
}

function Execution({ service }: { service: Service }) {
  if (!service.stages.length && !service.execution_note) return null;
  return (
    <section aria-labelledby="stages-title" className="bg-paper section-y-sm">
      <div className="container-site flex flex-col gap-12">
        <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-6">
          <h2 id="stages-title" className="m-0 heading-2-sm text-navy-950">
            Как организуется выполнение
          </h2>
          {service.execution_note ? <p className="m-0 lead-text text-muted">{service.execution_note}</p> : null}
        </Reveal>
        {service.stages.length ? (
          <Reveal as="div" className="border border-line bg-line">
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-0.5 p-0">
              {service.stages.map((stage) => (
                <li
                  key={stage.title}
                  className="flex min-h-[180px] flex-col justify-end gap-2 bg-paper px-[22px] py-7 shadow-[inset_0_2px_0_#087CFF]"
                >
                  <span className="text-[19px] font-semibold text-navy-950">{stage.title}</span>
                  <span className="text-sm leading-normal text-muted">{stage.description}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/** «Состав работ»: карточки на тёмном фоне в стиле блока технических характеристик. */
function Scope({ service }: { service: Service }) {
  if (!service.scope.length) return null;
  return (
    <section aria-labelledby="scope-title" className="bg-navy-950 section-y-sm text-white">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-12">
        <Reveal>
          <h2 id="scope-title" className="m-0 heading-2-sm">
            Состав работ
          </h2>
        </Reveal>
        <Reveal>
          <InfoBlocks
            tone="dark"
            variant="title"
            minWidth={260}
            items={service.scope.map((item) => ({ key: item.title, label: item.title, value: item.description }))}
          />
        </Reveal>
      </div>
    </section>
  );
}

const asItems = (list: { title: string; description?: string }[]) =>
  list.map((i) => ({ title: i.title, text: i.description ?? "" }));

function Related({ service }: { service: Service }) {
  if (!service.projects.length) return null;
  return (
    <section aria-labelledby="related-title" className="bg-paper pb-[clamp(72px,9vw,130px)]">
      <div className="container-site flex flex-col gap-8">
        <div className="flex flex-wrap items-baseline justify-between gap-5 border-t border-navy-950 pt-6">
          <h2 id="related-title" className="m-0 text-[28px] font-semibold tracking-[-.02em] text-navy-950">
            Проекты по направлению
          </h2>
          <Link href="/projects" className="font-medium no-underline">
            Все проекты →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4">
          {service.projects.slice(0, 3).map((project) => (
            <Reveal key={project.id}>
              <Link
                href={`/projects/${project.slug}`}
                className="group flex flex-col gap-3.5 text-navy-950 no-underline hover:text-navy-950"
              >
                <div className="relative h-80 overflow-hidden rounded-[6px]">
                  <div className="absolute inset-0 transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04]">
                    <MediaImage
                      src={project.cover?.url}
                      alt={project.cover?.alt || project.title}
                      sizes="(min-width: 1100px) 33vw, 100vw"
                    />
                  </div>
                </div>
                <span className="text-[13px] text-accent-dark">{project.category?.title ?? project.type_label}</span>
                <span className="text-xl font-semibold">{project.title}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

async function ServiceContent({ params }: Pick<PageProps<"/services/[slug]">, "params">) {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) notFound();
  const service = await getService(slug);
  if (!service) notFound();

  return (
    <>
      <LightHero
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Услуги", href: "/services" },
          { name: service.title, href: `/services/${service.slug}` },
        ]}
        title={<span className="hyphens-auto">{service.title}</span>}
        text={service.summary}
      >
        <div className="-mt-5 flex flex-wrap gap-3">
          <ButtonLink href="#form" variant="dark" size="md" className="h-14">
            Рассчитать стоимость
          </ButtonLink>
          {service.faq.length ? (
            <ButtonLink href="#faq" variant="outlineDark" size="md" arrow={null} className="h-14">
              Вопросы
            </ButtonLink>
          ) : null}
        </div>
        <div className="relative">
          <div className="relative h-[clamp(260px,48vw,720px)] overflow-hidden rounded-[6px] bg-navy-800 sm:rounded-b-none">
            <MediaImage
              src={service.cover?.url}
              alt={service.cover?.alt || service.title}
              sizes="(min-width: 1440px) 1344px, 100vw"
              priority
            />
          </div>
          {service.hero_badges.length ? (
            // На телефоне — карточки под фото; с 640px — плашка поверх фото в правом нижнем углу
            <InfoBlocks
              minWidth={150}
              className="mt-3 sm:pointer-events-none sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:flex sm:gap-0 sm:rounded-tl-[6px] sm:bg-white sm:px-3 sm:py-2 sm:[&>div]:border-0 sm:[&>div]:bg-transparent sm:[&>div]:px-3 sm:[&>div]:py-3"
              items={service.hero_badges.map((b) => ({ key: b.k, label: b.k, value: b.v }))}
            />
          ) : null}
        </div>
      </LightHero>
      {service.description ? (
        <TextBlock
          id="about-service"
          title="Об услуге"
          paragraphs={service.description.split(/\n{2,}/).filter(Boolean)}
        />
      ) : null}
      <FeatureGrid
        id="tasks"
        tone="paper"
        data={{ title: "Какие задачи решает", text: "", items: asItems(service.tasks) }}
      />
      <Uses service={service} />
      <Scope service={service} />
      <Execution service={service} />
      <FeatureGrid
        id="limitations"
        tone="white"
        data={{ title: "Особенности и ограничения", text: "", items: asItems(service.limitations) }}
      />
      <Specs service={service} />
      <Related service={service} />
      {service.faq.length ? (
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-white section-y-sm">
          <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-12">
            <h2 id="faq-title" className="m-0 heading-2-sm text-navy-950">
              Частые вопросы
            </h2>
            <Accordion items={service.faq.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </div>
        </section>
      ) : null}
      <BandCta
        id="form"
        title={service.cta_title || `Расчёт: ${service.title.toLowerCase()}`}
        text={service.cta_text}
        label="Отправить документацию"
        href={`/request?service=${service.slug}`}
      />
      <JsonLd data={serviceJsonLd(service)} />
    </>
  );
}

export default function ServicePage({ params }: PageProps<"/services/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ServiceContent params={params} />
    </Suspense>
  );
}
