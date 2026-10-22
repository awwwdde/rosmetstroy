import { Reveal } from "@/components/animations/Reveal";
import { MediaImage } from "@/components/ui/MediaImage";
import type { AboutBlock } from "@/types/content";

type Props = { data: AboutBlock; id?: string };

/**
 * Блок «О компании»: текст слева; справа — фотографии, если они загружены в CMS,
 * иначе список «С кем работаем» (без условных изображений помещений).
 */
export function AboutIntro({ data, id = "about" }: Props) {
  const hasImages = Boolean(data.image_main || data.image_detail);
  const points = data.points ?? [];

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 bg-white section-y">
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))] gap-16">
        <Reveal className="flex flex-col gap-8">
          <h2
            id={`${id}-title`}
            className="m-0 text-[clamp(34px,4vw,58px)] leading-[1.04] font-semibold tracking-[-.03em] text-balance text-navy-950"
          >
            {data.title}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-10 gap-y-6 text-[17px] leading-relaxed text-muted">
            {data.paragraphs.map((p) => (
              <p key={p.text.slice(0, 40)} className="m-0 text-pretty">
                {p.text}
              </p>
            ))}
          </div>
        </Reveal>
        {hasImages ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                [data.image_main, data.image_main_alt],
                [data.image_detail, data.image_detail_alt],
              ]
                .filter(([src]) => src)
                .map(([src, alt], i) => (
                  <Reveal key={src} className="relative aspect-[3/4] overflow-hidden rounded-[6px]" delay={i * 0.08}>
                    <MediaImage src={src} alt={alt || data.title} sizes="(min-width: 1100px) 340px, 50vw" />
                  </Reveal>
                ))}
            </div>
            {data.caption ? <span className="text-sm leading-relaxed text-muted">{data.caption}</span> : null}
          </div>
        ) : points.length ? (
          <Reveal className="flex flex-col">
            {data.points_title ? <span className="pb-4 text-[13px] text-accent-dark">{data.points_title}</span> : null}
            <ul className="m-0 flex list-none flex-col border-b border-line p-0">
              {points.map((point) => (
                <li key={point.title} className="flex flex-col gap-1.5 border-t border-line py-5">
                  <span className="text-xl font-semibold tracking-[-.01em] text-navy-950">{point.title}</span>
                  <span className="text-[15px] leading-normal text-muted">{point.text}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
