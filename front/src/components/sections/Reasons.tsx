import { Reveal } from "@/components/animations/Reveal";
import type { HomeSections } from "@/types/content";

export function Reasons({ data }: { data: HomeSections["reasons"] }) {
  return (
    <section aria-labelledby="reasons-title" className="bg-mist section-y">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-14">
        <Reveal className="flex flex-col gap-6 self-start">
          <h2
            id="reasons-title"
            className="m-0 text-[clamp(34px,4vw,56px)] leading-[1.04] font-semibold tracking-[-.03em] text-balance text-navy-950"
          >
            {data.title}
          </h2>
          <p className="m-0 max-w-[440px] lead-text text-muted">{data.text}</p>
        </Reveal>
        <div className="flex flex-col">
          {data.items.map((item) => (
            <Reveal key={item.title} className="flex flex-col gap-3 border-t border-line-strong py-7">
              <h3 className="m-0 text-2xl font-semibold tracking-[-.015em] text-navy-950">{item.title}</h3>
              <p className="m-0 text-base leading-relaxed text-pretty text-muted">{item.text}</p>
              <span className="text-sm text-navy-800">{item.proof}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
