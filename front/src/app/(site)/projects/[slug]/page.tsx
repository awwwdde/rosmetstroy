import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { PageFallback } from "@/components/layout/PageFallback";
import { ImageHero } from "@/components/sections/PageHero";
import { JsonLd } from "@/components/ui/JsonLd";
import { MediaImage } from "@/components/ui/MediaImage";
import { InfoBlocks } from "@/components/ui/InfoBlocks";
import { ORG_ID, absoluteUrl, buildMetadata, webPageJsonLd } from "@/lib/seo";
import { PLACEHOLDER_SLUG, getProject, getSiteSettings, staticSlugs } from "@/services/content";
import type { ProjectDetail } from "@/types/content";
import { labelsOf } from "@/lib/labels";

export function generateStaticParams() {
  return staticSlugs("projects");
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [project, site] = await Promise.all([getProject(slug), getSiteSettings()]);
  if (!project) return { title: "Проект не найден", robots: { index: false } };
  return buildMetadata(site, {
    path: `/projects/${project.slug}`,
    title: project.seo_title || project.title,
    description: project.seo_description || project.intro || project.works_summary,
    image: project.cover?.url,
    modifiedTime: project.updated_at,
  });
}

function projectJsonLd(project: ProjectDetail) {
  const url = absoluteUrl(`/projects/${project.slug}`);
  const images = [project.cover, ...project.images.map((i) => i.media)]
    .filter((m) => m !== null && m !== undefined)
    .map((m) => absoluteUrl(m.url));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        // Реализованный объект как творческая работа компании: тип объекта, место, роль, состав работ
        "@type": "CreativeWork",
        "@id": `${url}#project`,
        name: project.title,
        genre: project.type_label || project.category?.title || undefined,
        description: project.intro || project.works_summary,
        abstract: project.result || undefined,
        url,
        image: images.length ? [...new Set(images)] : undefined,
        creator: { "@id": ORG_ID },
        locationCreated: project.location ? { "@type": "Place", name: project.location } : undefined,
        about: project.services.map((s) => ({ "@id": `${absoluteUrl(`/services/${s.slug}`)}#service`, name: s.title })),
        dateModified: project.updated_at,
        inLanguage: "ru-RU",
      },
      webPageJsonLd({
        path: `/projects/${project.slug}`,
        name: project.seo_title || project.title,
        description: project.seo_description || project.intro || project.works_summary,
        dateModified: project.updated_at,
        image: project.cover?.url,
        extra: { "@context": undefined, mainEntity: { "@id": `${url}#project` } },
      }),
    ],
  };
}

function Gallery({ project }: { project: ProjectDetail }) {
  const [first, second, panorama, ...rest] = project.images;
  return (
    <>
      {first || second ? (
        <section className="pb-[clamp(72px,9vw,130px)]">
          <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-4">
            {[first, second].filter(Boolean).map((img, i) => (
              <Reveal
                key={img!.id}
                className={
                  i === 1
                    ? "relative h-[clamp(320px,40vw,620px)] overflow-hidden rounded-[6px] min-[900px]:mt-[clamp(0px,6vw,96px)]"
                    : "relative h-[clamp(320px,40vw,620px)] overflow-hidden rounded-[6px]"
                }
              >
                <MediaImage
                  src={img!.media.url}
                  alt={img!.media.alt || img!.caption || project.title}
                  sizes="(min-width: 900px) 50vw, 100vw"
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
      {panorama ? (
        <section aria-label="Фотографии объекта" className="section-y-sm">
          <div className="container-site grid auto-rows-[300px] grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
            <Reveal className="relative col-span-full h-[clamp(300px,45vw,680px)] overflow-hidden rounded-[6px]">
              <MediaImage
                src={panorama.media.url}
                alt={panorama.media.alt || panorama.caption || project.title}
                sizes="100vw"
              />
            </Reveal>
            {rest.map((img) => (
              <Reveal key={img.id} className="relative overflow-hidden rounded-[6px]">
                <MediaImage
                  src={img.media.url}
                  alt={img.media.alt || img.caption || project.title}
                  sizes="(min-width: 900px) 33vw, 100vw"
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

async function ProjectContent({ params }: Pick<PageProps<"/projects/[slug]">, "params">) {
  const { slug } = await params;
  if (slug === PLACEHOLDER_SLUG) notFound();
  const [project, site] = await Promise.all([getProject(slug), getSiteSettings()]);
  if (!project) notFound();
  const l = labelsOf(site);

  // Базовые сведения о кейсе + подтверждённые характеристики из CMS
  const params_ = [
    { k: "Тип объекта", v: project.type_label },
    { k: "Местоположение", v: project.location },
    { k: "Выполненные работы", v: project.works_summary },
    ...project.params,
  ].filter((p) => p.v);

  return (
    <>
      <ImageHero
        tall
        crumbs={[
          { name: "Главная", href: "/" },
          { name: "Проекты", href: "/projects" },
          { name: project.type_label || project.title, href: `/projects/${project.slug}` },
        ]}
        title={project.title}
        image={project.cover?.url}
        imageAlt={project.cover?.alt || project.title}
      />

      {params_.length ? (
        <section className="bg-white pt-10">
          <div className="container-site">
            <InfoBlocks
              tone="paper"
              minWidth={200}
              size="lg"
              items={params_.map((p) => ({ key: p.k, label: p.k, value: p.v }))}
            />
          </div>
        </section>
      ) : null}

      {project.intro || project.company_role || project.features || project.solution ? (
        <section className="bg-white section-y-sm">
          <div className="container-site">
            <Reveal className="flex max-w-[1100px] flex-col gap-7">
              {project.intro ? (
                <span className="text-[13px] font-semibold tracking-[.02em] text-accent-dark">{l.project_task}</span>
              ) : null}
              {project.intro ? (
                <p className="m-0 text-[clamp(24px,2.4vw,36px)] leading-[1.3] font-medium tracking-[-.015em] text-pretty text-navy-950">
                  {project.intro}
                </p>
              ) : null}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-8 text-[17px] leading-relaxed text-muted">
                {project.company_role ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold tracking-[.02em] text-navy-950">{l.project_role}</span>
                    <span>{project.company_role}</span>
                  </div>
                ) : null}
                {project.features ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold tracking-[.02em] text-navy-950">
                      Особенности проекта
                    </span>
                    <span>{project.features}</span>
                  </div>
                ) : null}
                {project.solution ? (
                  <div className="flex flex-col gap-3">
                    <span className="text-[13px] font-semibold tracking-[.02em] text-navy-950">
                      {l.project_solution}
                    </span>
                    <span>{project.solution}</span>
                  </div>
                ) : null}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      <div className="bg-white">
        <Gallery project={project} />
      </div>

      {project.works.length ? (
        <section aria-labelledby="works-title" className="bg-paper section-y-sm">
          <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-14">
            <Reveal>
              <h2
                id="works-title"
                className="m-0 text-[clamp(32px,3.6vw,52px)] leading-[1.04] font-semibold tracking-[-.03em] text-navy-950"
              >
                Выполненные работы
              </h2>
            </Reveal>
            <ol className="m-0 flex list-none flex-col p-0">
              {project.works.map((w) => (
                <Reveal as="li" key={w.title} className="flex flex-col gap-1.5 border-t border-line py-[22px]">
                  <span className="text-xl font-semibold text-navy-950">{w.title}</span>
                  <span className="text-[15px] leading-normal text-muted">{w.description}</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {project.result ? (
        <section className="bg-navy-950 section-y-sm text-white">
          <div className="container-site">
            <Reveal className="flex flex-col gap-5">
              <span className="text-[13px] text-sky">{l.project_result}</span>
              <p className="m-0 max-w-[1100px] text-[clamp(24px,2.4vw,36px)] leading-[1.3] font-medium tracking-[-.015em] text-pretty">
                {project.result}
              </p>
            </Reveal>
          </div>
        </section>
      ) : null}

      {project.services.length ? (
        <section className="border-t border-sky/12 bg-navy-950 py-10 text-white">
          <div className="container-site flex flex-wrap items-center gap-3 text-sm">
            <span className="text-sky">Направления:</span>
            {project.services.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.slug}`}
                className="rounded-[4px] border border-sky/25 px-3 py-1.5 text-white no-underline hover:border-accent hover:text-white"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {project.next_project ? (
        <Link
          href={`/projects/${project.next_project.slug}`}
          className="group relative block h-[clamp(320px,40vw,520px)] overflow-hidden bg-navy-800 text-white no-underline hover:text-white"
        >
          <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.03]">
            <MediaImage src={project.next_project.cover?.url} alt={project.next_project.title} sizes="100vw" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[rgba(7,29,54,.6)]" />
          <div className="pointer-events-none absolute inset-0 container-site flex flex-col justify-between py-12">
            <span className="text-[13px] text-sky">{l.project_next} →</span>
            <span className="text-[clamp(36px,5vw,72px)] leading-none font-semibold tracking-[-.035em]">
              {project.next_project.title}
            </span>
          </div>
        </Link>
      ) : null}
      <JsonLd data={projectJsonLd(project)} />
    </>
  );
}

export default function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <ProjectContent params={params} />
    </Suspense>
  );
}
