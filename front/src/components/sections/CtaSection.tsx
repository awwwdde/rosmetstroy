import { Reveal } from "@/components/animations/Reveal";
import { QuickLeadForm } from "@/components/forms/QuickLeadForm";
import type { CtaSection as CtaData, SiteSettings } from "@/types/content";

type Props = { data: CtaData; site: Pick<SiteSettings, "phone" | "phone_href" | "email"> };

/** Финальный блок с контактами и короткой формой заявки. */
export function CtaSection({ data, site }: Props) {
  return (
    <section id="cta" aria-labelledby="cta-title" className="relative overflow-hidden bg-navy-800 section-y text-white">
      <div className="relative container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-x-20 gap-y-14">
        <Reveal className="flex flex-col gap-7">
          <h2
            id="cta-title"
            className="m-0 text-[clamp(38px,5vw,76px)] leading-none font-semibold tracking-[-.035em] text-balance"
          >
            {data.title}
          </h2>
          <p className="m-0 max-w-[460px] lead-text text-white/75">{data.text}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            <a
              href={`tel:${site.phone_href}`}
              className="text-[28px] font-medium tracking-[-.01em] text-white no-underline hover:text-sky"
            >
              {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="text-base text-sky no-underline hover:text-white">
              {site.email}
            </a>
          </div>
        </Reveal>
        <Reveal>
          <QuickLeadForm successTitle={data.success_title || "Спасибо. Инженер свяжется с вами в рабочее время."} />
        </Reveal>
      </div>
    </section>
  );
}
