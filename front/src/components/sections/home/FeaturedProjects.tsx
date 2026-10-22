import Link from "next/link";

import { Reveal } from "@/components/animations/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MediaImage } from "@/components/ui/MediaImage";
import { cn } from "@/lib/utils";
import type { HomeSections, ProjectCard } from "@/types/content";

import { SectionIntro } from "../SectionIntro";

// Мозаика из дизайна: 8×2, 4, 4, 5, 7 колонок из 12 (на узких экранах — одна колонка)
const SPANS = [
  "min-[900px]:col-span-8 min-[900px]:row-span-2",
  "min-[900px]:col-span-4",
  "min-[900px]:col-span-4",
  "min-[900px]:col-span-5",
  "min-[900px]:col-span-7",
];

type Props = { data: HomeSections["projects"]; projects: ProjectCard[] };

export function FeaturedProjects({ data, projects }: Props) {
  // Пока реальные кейсы не опубликованы, блок показывает пояснение вместо условных проектов
  if (!projects.length) {
    if (!data.empty_text) return null;
    return (
      <section aria-labelledby="projects-title" className="bg-paper section-y-sm">
        <div className="container-site flex flex-col gap-8">
          <SectionIntro
            id="projects-title"
            title={data.title}
            action={
              <ButtonLink href="/request" variant="outlineDark" size="md">
                Обсудить проект
              </ButtonLink>
            }
          />
          <p className="m-0 max-w-[640px] border-t border-navy-950 pt-6 lead-text text-muted">{data.empty_text}</p>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="projects-title" className="bg-paper section-y">
      <div className="container-site flex flex-col gap-14">
        <SectionIntro
          id="projects-title"
          title={data.title}
          action={
            <ButtonLink href={data.link_href} variant="outlineDark" size="md" arrow="→">
              {data.link_label}
            </ButtonLink>
          }
        />
        <div className="grid auto-rows-[360px] grid-cols-1 gap-4 min-[900px]:auto-rows-[300px] min-[900px]:grid-cols-12">
          {projects.slice(0, SPANS.length).map((project, index) => (
            <Reveal key={project.id} className={cn("relative", SPANS[index])}>
              <Link
                href={`/projects/${project.slug}`}
                className="group absolute inset-0 block overflow-hidden rounded-[6px] bg-navy-800 text-white no-underline hover:text-white"
              >
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.04]">
                  <MediaImage
                    src={project.cover?.url}
                    alt={project.cover?.alt || project.title}
                    sizes={index === 0 ? "(min-width: 900px) 66vw, 100vw" : "(min-width: 900px) 40vw, 100vw"}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,29,54,0)_45%,rgba(7,29,54,.9)_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.5 p-6">
                  <span className="text-[13px] text-sky">{project.type_label}</span>
                  <span className="text-[clamp(20px,1.8vw,26px)] leading-[1.15] font-semibold tracking-[-.015em]">
                    {project.title}
                  </span>
                  <span className="text-sm text-white/72">{project.works_summary}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
