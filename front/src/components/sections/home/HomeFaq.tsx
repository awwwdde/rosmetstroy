import { Reveal } from "@/components/animations/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { SmartLink } from "@/components/ui/SmartLink";
import type { Faq, HomeSections } from "@/types/content";

export function HomeFaq({ data, items }: { data: HomeSections["faq"]; items: Faq[] }) {
  if (!items.length) return null;
  return (
    <section id="faq" aria-labelledby="home-faq-title" className="scroll-mt-20 bg-white section-y-sm">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-12">
        <Reveal className="flex flex-col items-start gap-5">
          <h2 id="home-faq-title" className="m-0 heading-2-sm text-navy-950">
            {data.title}
          </h2>
          {data.text ? <p className="m-0 max-w-[440px] lead-text text-muted">{data.text}</p> : null}
          {data.link_href ? (
            <SmartLink href={data.link_href} className="font-medium no-underline">
              {data.link_label} →
            </SmartLink>
          ) : null}
        </Reveal>
        <Accordion items={items.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
      </div>
    </section>
  );
}
