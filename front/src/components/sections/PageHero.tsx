import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MediaImage } from "@/components/ui/MediaImage";

type Crumb = { name: string; href: string };

/** Светлый первый экран внутренних страниц (Услуга, Заявка). */
export function LightHero({
  crumbs,
  title,
  text,
  children,
}: {
  crumbs: Crumb[];
  title: ReactNode;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-paper pt-[150px]">
      <div className="container-site flex flex-col gap-12">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-col items-start gap-5">
          <h1 className="m-0 display-page text-navy-950">{title}</h1>
          {text ? <p className="m-0 max-w-[620px] text-lg leading-relaxed text-pretty text-muted">{text}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Тёмный первый экран (Проекты): заголовок слева, подводка справа. */
export function DarkHero({
  crumbs,
  title,
  text,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-navy-950 pt-[180px] text-white">
      <div className="container-site flex flex-col gap-10">
        <Breadcrumbs items={crumbs} tone="dark" />
        <div className="flex flex-wrap items-start justify-between gap-8">
          <h1 className="m-0 text-[clamp(48px,7vw,104px)] leading-[.95] font-semibold tracking-[-.04em]">{title}</h1>
          {text ? <p className="m-0 max-w-[420px] lead-text text-white/70">{text}</p> : null}
        </div>
        {children ?? <div className="pb-14" />}
      </div>
    </section>
  );
}

/** Полноэкранный первый экран с фотографией (кейс, О компании, Производство). */
export function ImageHero({
  crumbs,
  title,
  text,
  image,
  imageAlt,
  tall = false,
}: {
  crumbs: Crumb[];
  title: string;
  text?: string;
  image?: string | null;
  imageAlt: string;
  tall?: boolean;
}) {
  return (
    <section
      className={
        tall
          ? "relative h-[max(620px,92vh)] overflow-hidden bg-navy-950 text-white"
          : "relative h-[max(560px,72vh)] overflow-hidden bg-navy-950 text-white"
      }
    >
      <div className="absolute inset-0">
        <MediaImage src={image} alt={imageAlt} sizes="100vw" priority />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,29,54,.55)_0%,rgba(7,29,54,0)_30%,rgba(7,29,54,.2)_55%,rgba(7,29,54,.92)_100%)]" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="container-site flex flex-col gap-7 pb-12">
          <Breadcrumbs items={crumbs} tone="overlay" />
          <h1 className="m-0 max-w-[1100px] display-1 text-[clamp(40px,6vw,88px)]">{title}</h1>
          {text ? (
            <p className="m-0 max-w-[620px] text-[clamp(17px,1.4vw,20px)] leading-[1.55] text-pretty text-white/82">
              {text}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
