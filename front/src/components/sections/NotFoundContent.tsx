import Link from "next/link";

import { getPage } from "@/services/content";
import type { NotFoundSections } from "@/types/content";

const DEFAULTS: NotFoundSections["hero"] = {
  code: "404",
  title: "Страница не найдена",
  text: "Адрес изменился или страница удалена. Основные разделы — ниже.",
};

async function loadHero(): Promise<NotFoundSections["hero"]> {
  try {
    return (await getPage<NotFoundSections>("not-found"))?.sections.hero ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const outline =
  "flex h-12 items-center rounded-[4px] border border-sky/40 px-5 text-white no-underline hover:border-white hover:text-white";

export async function NotFoundContent() {
  const hero = await loadHero();
  return (
    <section className="flex min-h-[80dvh] items-end border-t border-sky/12 bg-navy-950 pt-[150px] pb-[clamp(72px,9vw,130px)] text-white">
      <div className="container-site flex flex-col items-start gap-5">
        <span
          aria-hidden="true"
          className="text-[clamp(120px,18vw,260px)] leading-[.85] font-light tracking-[-.06em] text-accent-dark"
        >
          {hero.code}
        </span>
        <div className="flex flex-col gap-7">
          <h1 className="m-0 heading-2-sm">{hero.title}</h1>
          <p className="m-0 lead-text text-white/72">{hero.text}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="flex h-12 items-center rounded-[4px] bg-white px-5 font-semibold text-navy-950 no-underline hover:bg-accent hover:text-white"
            >
              На главную
            </Link>
            <Link href="/services" className={outline}>
              Услуги
            </Link>
            <Link href="/projects" className={outline}>
              Проекты
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
