import { Reveal } from "@/components/animations/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: string;
  paragraphs: string[];
  link?: { label: string; href: string } | null;
  tone?: "white" | "paper" | "dark";
};

/** Заголовок слева, текст справа — для описательных блоков без иллюстраций. */
export function TextBlock({ id, title, paragraphs, link, tone = "white" }: Props) {
  const dark = tone === "dark";
  if (!title && !paragraphs.length) return null;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("section-y-sm", dark ? "bg-navy-950 text-white" : tone === "paper" ? "bg-paper" : "bg-white")}
    >
      <div className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-20 gap-y-8">
        <Reveal>
          <h2 id={`${id}-title`} className={cn("m-0 heading-2-sm", !dark && "text-navy-950")}>
            {title}
          </h2>
        </Reveal>
        <Reveal
          className={cn("flex flex-col gap-5 text-[17px] leading-relaxed", dark ? "text-white/75" : "text-muted")}
        >
          {paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="m-0 text-pretty">
              {p}
            </p>
          ))}
          {link?.href && link.label ? (
            <SmartLink
              href={link.href}
              className={cn(
                "mt-2 self-start border-b border-accent pb-1 font-medium no-underline",
                dark ? "text-white hover:text-sky" : "text-navy-950 hover:text-accent",
              )}
            >
              {link.label} →
            </SmartLink>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
