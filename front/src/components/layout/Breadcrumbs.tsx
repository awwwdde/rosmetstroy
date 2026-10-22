import Link from "next/link";
import { Fragment } from "react";

import { JsonLd } from "@/components/ui/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Crumb = { name: string; href: string };

type Props = { items: Crumb[]; tone?: "light" | "dark" | "overlay"; className?: string };

const tones = {
  light: { base: "text-muted", current: "text-accent" },
  dark: { base: "text-white/55", current: "text-sky" },
  overlay: { base: "text-white/65", current: "text-sky" },
};

export function Breadcrumbs({ items, tone = "light", className }: Props) {
  const t = tones[tone];
  return (
    <>
      <nav aria-label="Хлебные крошки" className={cn("flex flex-wrap gap-2.5 text-[13px]", t.base, className)}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <Fragment key={item.href}>
              {last ? (
                <span aria-current="page" className={t.current}>
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="text-inherit no-underline hover:text-inherit hover:underline">
                    {item.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </Fragment>
          );
        })}
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}
