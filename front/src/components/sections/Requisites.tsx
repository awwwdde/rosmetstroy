import { Reveal } from "@/components/animations/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import type { SiteSettings } from "@/types/content";

type Props = { title: string; text: string; site: SiteSettings };

/** «Документы и реквизиты»: показываются только заполненные в CMS строки. */
export function Requisites({ title, text, site }: Props) {
  const rows = (site.requisites ?? []).filter((r) => r.k && r.v);
  return (
    <section aria-labelledby="requisites-title" className="bg-paper section-y-sm">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-10">
        <Reveal className="flex flex-col gap-5">
          <h2 id="requisites-title" className="m-0 heading-2-sm text-navy-950">
            {title}
          </h2>
          {text ? <p className="m-0 max-w-[440px] lead-text text-muted">{text}</p> : null}
        </Reveal>
        <Reveal className="flex flex-col gap-8">
          {rows.length ? (
            <dl className="m-0 flex flex-col border-b border-line">
              {rows.map((row) => (
                <div key={row.k} className="grid grid-cols-[minmax(140px,1fr)_2fr] gap-6 border-t border-line py-4">
                  <dt className="pt-0.5 text-[13px] text-accent-dark">{row.k}</dt>
                  <dd className="m-0 text-base text-navy-950">{row.v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {site.documents.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {site.documents.map((doc) => (
                <li key={doc.href}>
                  <SmartLink href={doc.href} className="font-medium no-underline">
                    {doc.label} →
                  </SmartLink>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
