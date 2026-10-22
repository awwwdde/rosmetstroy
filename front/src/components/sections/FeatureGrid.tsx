import { Reveal } from "@/components/animations/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";
import type { ItemsSection, LinkedItem } from "@/types/content";

import { SectionIntro } from "./SectionIntro";

const tones = { white: "bg-white", paper: "bg-paper", mist: "bg-mist" };

function Cell({ item }: { item: LinkedItem }) {
  const body = (
    <>
      <span aria-hidden="true" className="h-0.5 w-8 bg-accent" />
      <h3 className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-.01em] text-navy-950">{item.title}</h3>
      <p className="m-0 flex-1 text-[15px] leading-[1.55] text-pretty text-muted">{item.text}</p>
      {item.href ? <span className="text-sm font-medium text-accent">Подробнее →</span> : null}
    </>
  );
  const cls =
    "flex h-full min-h-[220px] flex-col gap-4 border-r border-b border-navy-950/25 px-7 pt-8 pb-7 no-underline transition-colors duration-250";
  return item.href ? (
    <SmartLink href={item.href} className={cn(cls, "hover:bg-accent/5")}>
      {body}
    </SmartLink>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Сетка карточек с акцентной линией — повторяет стиль блока «Как мы работаем» из дизайна. */
export function FeatureGrid({
  id,
  data,
  tone = "white",
}: {
  id: string;
  data: ItemsSection;
  tone?: keyof typeof tones;
}) {
  if (!data?.items?.length) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-20 section-y", tones[tone])}>
      <div className="container-site flex flex-col gap-14">
        <SectionIntro id={`${id}-title`} title={data.title} text={data.text} />
        <Reveal className="border-t border-navy-950">
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] p-0">
            {data.items.map((item) => (
              <li key={item.title}>
                <Cell item={item} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
