"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MediaImage } from "@/components/ui/MediaImage";
import { cn, pad2 } from "@/lib/utils";
import type { Category, ProjectCard } from "@/types/content";

// Размеры плиток из дизайна (сетка 12 колонок, строка 420px)
const SIZE_CLASS: Record<string, string> = {
  big: "min-[900px]:col-span-8 min-[900px]:row-span-2",
  wide: "min-[900px]:col-span-8",
  tall: "min-[900px]:col-span-4 min-[900px]:row-span-2",
  s: "min-[900px]:col-span-4",
};

type Props = {
  projects: ProjectCard[];
  categories: Category[];
  allLabel: string;
  shownLabel: string;
  emptyText?: string;
};

export function ProjectsGallery({ projects, categories, allLabel, shownLabel, emptyText }: Props) {
  const [filter, setFilter] = useState("all");
  const reduceMotion = useReducedMotion();

  const filters = useMemo(
    () => [
      { slug: "all", label: allLabel, count: projects.length },
      ...categories
        .map((c) => ({
          slug: c.slug,
          label: c.title,
          count: projects.filter((p) => p.category?.slug === c.slug).length,
        }))
        .filter((f) => f.count > 0),
    ],
    [allLabel, categories, projects],
  );
  const visible = filter === "all" ? projects : projects.filter((p) => p.category?.slug === filter);

  // Реальные кейсы ещё не опубликованы — вместо сетки показываем пояснение
  if (!projects.length) {
    return (
      <section aria-label="Проекты" className="border-t border-sky/18 bg-navy-950 pb-[clamp(80px,10vw,140px)]">
        <div className="container-site pt-10">
          <p className="m-0 max-w-[640px] lead-text text-white/70">{emptyText || "Кейсы готовятся к публикации."}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="bg-navy-950">
        <div
          role="toolbar"
          aria-label="Фильтр по типу работ"
          className="container-site flex [scrollbar-width:none] gap-1 overflow-x-auto border-t border-sky/18 pt-4 pb-5"
        >
          {filters.map((f) => {
            const active = f.slug === filter;
            return (
              <button
                key={f.slug}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.slug)}
                className={cn(
                  "flex h-11 flex-none cursor-pointer items-center gap-2.5 rounded-[4px] border px-[18px] font-[inherit] text-[15px] text-white transition-[background-color,border-color] duration-200",
                  active ? "border-accent bg-accent" : "border-sky/25 bg-transparent hover:border-sky/60",
                )}
              >
                {f.label}
                <span className={cn("text-[13px]", active ? "text-white" : "text-sky")}>{f.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section aria-label="Галерея проектов" className="pt-12 pb-[clamp(80px,10vw,140px)]">
        <div className="container-site flex flex-col gap-6">
          <div className="text-[13px] text-muted uppercase" aria-live="polite">
            {shownLabel}: {pad2(visible.length)}
          </div>
          <LayoutGroup>
            <motion.div
              layout={!reduceMotion}
              className="grid grid-flow-dense auto-rows-[380px] grid-cols-1 gap-4 min-[900px]:auto-rows-[420px] min-[900px]:grid-cols-12"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((project) => (
                  <motion.div
                    key={project.id}
                    layout={!reduceMotion}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                    className={cn("relative", SIZE_CLASS[project.layout_size] ?? SIZE_CLASS.s)}
                  >
                    <Link
                      href={`/projects/${project.slug}`}
                      className="group flex h-full flex-col gap-3.5 text-navy-950 no-underline hover:text-navy-950"
                    >
                      <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-[6px] bg-mist">
                        <div className="absolute inset-0 transition-transform duration-[1100ms] ease-out-soft group-hover:scale-[1.04]">
                          <MediaImage
                            src={project.cover?.url}
                            alt={project.cover?.alt || project.title}
                            sizes={
                              project.layout_size === "big" || project.layout_size === "wide"
                                ? "(min-width: 900px) 66vw, 100vw"
                                : "(min-width: 900px) 33vw, 100vw"
                            }
                          />
                        </div>
                        {project.category ? (
                          <span className="pointer-events-none absolute top-3.5 left-3.5 rounded-[3px] bg-white px-2.5 py-1.5 text-[13px]">
                            {project.category.label || project.category.title}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xl font-semibold tracking-[-.01em]">{project.title}</span>
                        <span className="text-sm text-muted">{project.works_summary}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
          {!visible.length ? (
            <p className="m-0 py-16 text-center text-muted">В этой категории пока нет проектов.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}
