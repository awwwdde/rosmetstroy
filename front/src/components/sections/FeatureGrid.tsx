import { Reveal } from "@/components/animations/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";
import type { ItemsSection, LinkedItem } from "@/types/content";

import { SectionIntro } from "./SectionIntro";
import { TaskPictogram, pictogramFor } from "./TaskPictogram";

const tones = { white: "bg-white", paper: "bg-paper", mist: "bg-mist" };
// Карточка контрастна фону секции: на белом — «бумага», на сером — белая
const cardTones = { white: "bg-paper", paper: "bg-white", mist: "bg-white" };

function Card({ item, tone }: { item: LinkedItem; tone: keyof typeof tones }) {
  const kind = pictogramFor(item.href);
  const body = (
    <>
      {kind ? <TaskPictogram kind={kind} /> : <span aria-hidden="true" className="h-0.5 w-8 bg-accent" />}
      <h3 className="m-0 text-[21px] leading-[1.2] font-semibold tracking-[-.01em] text-balance text-navy-950">
        {item.title}
      </h3>
      <p className="m-0 flex-1 text-[15px] leading-[1.55] text-pretty text-muted">{item.text}</p>
      {item.href ? (
        <span className="mt-2 flex items-center justify-between border-t border-line pt-4 text-sm font-medium text-accent-dark">
          Перейти к услуге
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            className="transition-transform duration-300 ease-out-soft group-hover:translate-x-1"
          >
            <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </span>
      ) : null}
    </>
  );
  const cls = cn(
    "group flex h-full flex-col gap-4 rounded-[6px] border border-line p-6 no-underline sm:p-7",
    cardTones[tone],
  );
  return item.href ? (
    <SmartLink
      href={item.href}
      className={cn(
        cls,
        "transition-[border-color,background-color] duration-300 hover:border-accent hover:bg-white focus-visible:border-accent",
      )}
    >
      {body}
    </SmartLink>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Карточки задач и компетенций: у ссылок на услуги — чертёжная пиктограмма объекта. */
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
        <Reveal>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {data.items.map((item) => (
              <li key={item.title}>
                <Card item={item} tone={tone} />
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
