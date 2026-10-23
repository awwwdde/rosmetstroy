import { Reveal } from "@/components/animations/Reveal";
import { buttonClass } from "@/components/ui/ButtonLink";
import { InfoBlocks } from "@/components/ui/InfoBlocks";
import { ExternalIcon, PartnerLink } from "@/components/ui/PartnerLink";
import type { SiteSettings } from "@/types/content";

/**
 * «Работы выполняет студия …» — на страницах партнёрских услуг. Все сведения о студии
 * берутся из «Настроек сайта → Партнёрская IT-студия», чтобы их можно было обновить без разработчика.
 */
export function PartnerStudio({ partner }: { partner: SiteSettings["partner"] }) {
  if (!partner?.name || !partner.about) return null;
  const competencies = partner.competencies ?? [];
  const cases = partner.cases ?? [];
  return (
    <section aria-labelledby="studio-title" className="bg-ink section-y text-white">
      <div className="container-site grid gap-x-20 gap-y-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal className="flex flex-col gap-7 lg:sticky lg:top-32 lg:self-start">
          <h2 id="studio-title" className="m-0 heading-2-sm text-balance">
            Работы выполняет студия {partner.name}
          </h2>
          <p className="m-0 max-w-[520px] lead-text text-pretty text-white/72">{partner.about}</p>
          {partner.facts?.length ? (
            <InfoBlocks
              tone="dark"
              minWidth={200}
              items={partner.facts.map((f) => ({ key: f.k, label: f.k, value: f.v }))}
            />
          ) : null}
          <PartnerLink partner={partner} className={buttonClass("accent", "md", "self-start")}>
            Сайт студии {partner.name}
            <ExternalIcon />
          </PartnerLink>
        </Reveal>

        <div className="flex flex-col gap-12">
          {competencies.length ? (
            <Reveal className="flex flex-col gap-5">
              <h3 className="m-0 text-[22px] leading-tight font-semibold tracking-[-.01em]">Что делает студия</h3>
              <InfoBlocks
                tone="dark"
                variant="title"
                minWidth={240}
                items={competencies.map((c) => ({ key: c.title, label: c.title, value: c.text }))}
              />
            </Reveal>
          ) : null}
          {cases.length ? (
            <Reveal className="flex flex-col gap-5">
              <h3 className="m-0 text-[22px] leading-tight font-semibold tracking-[-.01em]">Среди проектов студии</h3>
              <InfoBlocks
                tone="dark"
                variant="title"
                minWidth={240}
                items={cases.map((c) => ({ key: c.title, label: c.title, value: c.text }))}
              />
              <PartnerLink
                partner={partner}
                className="flex items-center gap-2 self-start border-b border-accent pb-1 text-[15px] font-medium text-white hover:text-sky"
              >
                Все проекты на сайте студии
                <ExternalIcon />
              </PartnerLink>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
