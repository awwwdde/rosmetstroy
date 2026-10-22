import { Reveal } from "@/components/animations/Reveal";
import type { HomeSections } from "@/types/content";

import { SectionIntro } from "../SectionIntro";

export function WorkProcess({ data }: { data: HomeSections["process"] }) {
  return (
    <section aria-labelledby="process-title" className="bg-white section-y">
      <div className="container-site flex flex-col gap-14">
        <SectionIntro id="process-title" title={data.title} text={data.text} />
        <Reveal className="relative border-t border-navy-950">
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] p-0">
            {data.steps.map((step) => (
              <li
                key={step.title}
                className="relative flex min-h-[260px] flex-col gap-4 border-r border-b border-navy-950/25 px-7 pt-8 pb-7 transition-colors duration-250 hover:bg-accent/5"
              >
                <span aria-hidden="true" className="h-0.5 w-8 bg-accent" />
                <h3 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-.01em] text-navy-950">
                  {step.title}
                </h3>
                <p className="m-0 flex-1 text-[15px] leading-[1.55] text-pretty text-muted">{step.text}</p>
                <div className="flex items-baseline gap-2.5 border-t border-dashed border-navy-950/30 pt-3 text-sm text-navy-950">
                  <span className="text-muted">{data.result_label}</span>
                  {step.result}
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
