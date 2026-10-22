import { Reveal } from "@/components/animations/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { HomeSections } from "@/types/content";

export function ItPartner({ data }: { data: HomeSections["it"] }) {
  return (
    <section id="it" aria-labelledby="it-title" className="scroll-mt-20 bg-ink py-[clamp(64px,8vw,110px)] text-white">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-x-20 gap-y-12">
        <Reveal className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-[13px]">
            <span aria-hidden="true" className="size-2 bg-accent" />
            <span className="text-sky">{data.badge}</span>
          </div>
          <h2
            id="it-title"
            className="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.06] font-semibold tracking-[-.025em] text-balance"
          >
            {data.title}
          </h2>
          <p className="m-0 max-w-[480px] text-base leading-relaxed text-pretty text-white/68">{data.text}</p>
          <ButtonLink href={data.link_href} variant="outlineSky" size="sm" className="self-start">
            {data.link_label}
          </ButtonLink>
        </Reveal>
        <Reveal className="rounded-[4px] border border-sky/18">
          <ul className="m-0 list-none p-0">
            {data.items.map((item) => (
              <li key={item.title} className="flex flex-col gap-1.5 border-b border-sky/10 px-6 py-5 last:border-b-0">
                <span className="text-lg font-medium">{item.title}</span>
                <span className="text-[13px] leading-normal text-white/55">{item.text}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
