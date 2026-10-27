"use client";

import { useReducedMotion, useScroll, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";

import { Reveal } from "@/components/animations/Reveal";
import type { HomeSections } from "@/types/content";

import { SectionIntro } from "../SectionIntro";

/**
 * «Как мы работаем» — этапы на вертикальной направляющей. Это действительно последовательность,
 * поэтому номера уместны; направляющая заполняется акцентом по мере прокрутки — единственный
 * движущийся элемент блока. У каждого этапа отдельной плашкой — результат для заказчика.
 */
export function WorkProcess({ data }: { data: HomeSections["process"] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <section aria-labelledby="process-title" className="bg-navy-950 section-y text-white">
      <div className="container-site grid gap-x-20 gap-y-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SectionIntro
          id="process-title"
          title={data.title}
          text={data.text}
          tone="dark"
          className="lg:sticky lg:top-32 lg:self-start"
        />

        <ol ref={listRef} className="relative m-0 flex list-none flex-col gap-4 p-0">
          {/* Направляющая: серая основа и акцентное заполнение */}
          <span aria-hidden="true" className="absolute top-5 bottom-5 left-[15px] w-0.5 bg-sky/16 sm:left-[19px]" />
          <m.span
            aria-hidden="true"
            className="absolute top-5 bottom-5 left-[15px] w-0.5 origin-top bg-accent sm:left-[19px]"
            style={{ scaleY: reduceMotion ? 1 : progress }}
          />

          {data.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-x-6"
            >
              <span
                aria-hidden="true"
                className="relative z-10 mt-5 flex size-8 items-center justify-center rounded-full border-2 border-accent bg-navy-950 text-[13px] font-semibold text-white tabular-nums sm:size-10 sm:text-[15px]"
              >
                {index + 1}
              </span>
              <Reveal className="overflow-hidden rounded-[6px] border border-sky/16 bg-white/[.04]">
                <div className="flex flex-col gap-3 p-5 sm:p-7">
                  <h3 className="m-0 text-[clamp(19px,1.7vw,22px)] leading-[1.2] font-semibold tracking-[-.01em] text-white">
                    <span className="sr-only">Этап {index + 1}. </span>
                    {step.title}
                  </h3>
                  <p className="m-0 max-w-[62ch] text-[15px] leading-[1.55] text-pretty text-white/65">{step.text}</p>
                </div>
                {step.result ? (
                  <div className="flex flex-col gap-1 border-t border-sky/12 bg-white/[.05] px-5 py-4 sm:flex-row sm:items-baseline sm:gap-3 sm:px-7">
                    <span className="shrink-0 text-[13px] text-sky">{data.result_label}</span>
                    <span className="text-[15px] leading-snug font-medium text-white">{step.result}</span>
                  </div>
                ) : null}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
