import { Parallax } from "@/components/animations/Parallax";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MediaImage } from "@/components/ui/MediaImage";
import { SmartLink } from "@/components/ui/SmartLink";
import type { HomeSections } from "@/types/content";

export function HomeHero({ data }: { data: HomeSections["hero"] }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[max(680px,94vh)] flex-col overflow-hidden bg-navy-900 text-white"
    >
      <Parallax className="absolute top-[-4%] right-0 bottom-[-4%] w-[min(64%,1100px)]">
        <MediaImage
          src={data.image}
          alt={data.image_alt}
          sizes="(min-width: 1720px) 1100px, 64vw"
          priority
          objectPosition="30% 40%"
        />
      </Parallax>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0A2747_0%,#0A2747_34%,rgba(10,39,71,.78)_50%,rgba(10,39,71,.15)_72%,rgba(10,39,71,0)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(0deg,rgba(7,29,54,.85),rgba(7,29,54,0))]"
      />

      <div className="relative container-site flex flex-1 flex-col justify-center gap-8 pt-40 pb-16">
        <h1 id="hero-title" className="m-0 max-w-[980px] display-1">
          {data.title}
        </h1>
        <p className="m-0 max-w-[560px] text-[clamp(17px,1.4vw,20px)] leading-[1.55] text-pretty text-white/82">
          {data.text}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <ButtonLink href={data.primary_href} variant="light">
            {data.primary_label}
          </ButtonLink>
          <ButtonLink
            href={data.secondary_href}
            variant="ghostLight"
            arrow={data.secondary_href.startsWith("#") ? "↓" : "→"}
          >
            {data.secondary_label}
          </ButtonLink>
        </div>
      </div>

      {data.facts.length ? (
        <div className="relative border-t border-sky/18 bg-[rgba(7,29,54,.55)] backdrop-blur-[10px]">
          {/* Телефон — столбец, планшет — 2 колонки, десктоп — строка с разделителями; отступы не «съезжают» */}
          <ul className="m-0 container-site grid list-none grid-cols-1 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-0">
            {data.facts.map((fact, index) => {
              // Первое направление (металлоконструкции) — основное, выделено акцентной линией
              const body = (
                <>
                  <span className="flex items-center gap-2.5 text-base font-medium">
                    {index === 0 ? <span aria-hidden="true" className="size-2 bg-accent" /> : null}
                    {fact.title}
                  </span>
                  <span className="text-sm leading-[1.4] text-white/60">{fact.text}</span>
                </>
              );
              return (
                <li
                  key={fact.title}
                  className="border-sky/14 max-lg:not-first:border-t sm:max-lg:nth-2:border-t-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0"
                >
                  {fact.href ? (
                    <SmartLink
                      href={fact.href}
                      className="flex flex-col gap-1 py-5 text-white no-underline transition-colors hover:text-sky lg:py-[26px]"
                    >
                      {body}
                    </SmartLink>
                  ) : (
                    <div className="flex flex-col gap-1 py-5 lg:py-[26px]">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
