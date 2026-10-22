import { Reveal } from "@/components/animations/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";

type Props = { title: string; text?: string; label: string; href: string; id?: string };

/** Синяя полоса призыва к действию (Услуга, Проекты). */
export function BandCta({ title, text, label, href, id }: Props) {
  return (
    <section id={id} className="scroll-mt-20 bg-navy-800 py-[clamp(64px,8vw,110px)] text-white">
      <Reveal className="container-site flex flex-wrap items-center justify-between gap-8">
        <div className="flex max-w-[760px] flex-col gap-5">
          <h2 className="m-0 text-[clamp(32px,4vw,60px)] leading-[1.02] font-semibold tracking-[-.03em] text-balance">
            {title}
          </h2>
          {text ? <p className="m-0 lead-text text-white/75">{text}</p> : null}
        </div>
        <ButtonLink href={href} variant="light">
          {label}
        </ButtonLink>
      </Reveal>
    </section>
  );
}
