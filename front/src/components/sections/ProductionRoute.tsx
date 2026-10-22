"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { MediaImage } from "@/components/ui/MediaImage";
import { SmartLink } from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";
import type { ProcessStep } from "@/types/content";

type Props = {
  id?: string;
  title: string;
  text: string;
  steps: ProcessStep[];
  linkLabel?: string;
  linkHref?: string;
};

/**
 * Этапы работ во вкладках с переключением описания и характеристик.
 * Колонка с фотографиями выводится, только если фото загружены в CMS.
 */
export function ProductionRoute({ id = "production", title, text, steps, linkLabel, linkHref }: Props) {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const tabsId = useId();
  if (!steps.length) return null;
  const current = steps[Math.min(active, steps.length - 1)];
  const hasImages = steps.some((step) => step.image);

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative overflow-hidden bg-navy-950 section-y text-white"
    >
      <div className="relative container-site flex flex-col gap-14">
        <Reveal className="flex flex-col items-start gap-5">
          <h2 id={`${id}-title`} className="m-0 heading-2">
            {title}
          </h2>
          <p className="m-0 max-w-[480px] lead-text text-white/70">{text}</p>
        </Reveal>

        <div
          role="tablist"
          aria-label="Этапы"
          className="relative grid border-t border-sky/20"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-px left-0 h-0.5 bg-accent transition-[width] duration-[600ms] ease-out-soft"
            style={{ width: `${((active + 1) / steps.length) * 100}%` }}
          />
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${tabsId}-panel`}
              onClick={() => setActive(index)}
              className={cn(
                "flex cursor-pointer flex-col gap-2.5 border-0 border-r border-sky/12 bg-transparent px-4 py-5 text-left font-[inherit] transition-colors duration-250 first:pl-0 hover:text-white",
                index === active ? "text-white" : "text-white/50",
              )}
            >
              <span className="text-[clamp(14px,1.3vw,18px)] leading-tight font-medium">{step.title}</span>
            </button>
          ))}
        </div>

        <div
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${active}`}
          className={cn(
            "grid items-stretch gap-12",
            hasImages ? "grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))]" : "grid-cols-1",
          )}
        >
          {hasImages ? (
            <div className="relative min-h-[440px] overflow-hidden rounded-[6px] bg-navy-800">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ opacity: index === active ? 1 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
                  style={{ pointerEvents: index === active ? "auto" : "none" }}
                  aria-hidden={index !== active}
                >
                  <MediaImage src={step.image} alt={step.image_alt} sizes="(min-width: 1100px) 640px, 100vw" />
                </motion.div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col justify-between gap-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                className={cn("gap-10", hasImages ? "flex flex-col" : "grid lg:grid-cols-2 lg:gap-20")}
              >
                <div className="flex flex-col gap-5">
                  <h3 className="m-0 text-[clamp(28px,3vw,44px)] leading-[1.05] font-semibold tracking-[-.025em]">
                    {current.title}
                  </h3>
                  <p className="m-0 max-w-[540px] lead-text text-white/75">{current.text}</p>
                </div>
                {current.specs.length ? (
                  <dl className="m-0 flex flex-col">
                    {current.specs.map((spec) => (
                      <div
                        key={spec.k}
                        className="grid grid-cols-[minmax(140px,1fr)_2fr] gap-6 border-t border-sky/16 py-4 text-[15px]"
                      >
                        <dt className="pt-0.5 text-[13px] text-sky">{spec.k}</dt>
                        <dd className="m-0 leading-normal text-white">{spec.v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </motion.div>
            </AnimatePresence>
            {linkLabel && linkHref ? (
              <SmartLink
                href={linkHref}
                className="flex items-center gap-3 self-start border-b border-accent pb-1 font-medium text-white no-underline hover:text-sky"
              >
                {linkLabel} →
              </SmartLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
