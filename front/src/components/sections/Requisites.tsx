import { Reveal } from "@/components/animations/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { InfoBlocks } from "@/components/ui/InfoBlocks";
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
          {rows.length ? <InfoBlocks items={rows.map((row) => ({ key: row.k, label: row.k, value: row.v }))} /> : null}
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
