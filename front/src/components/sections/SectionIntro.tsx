import type { ReactNode } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  text?: string;
  tone?: "light" | "dark";
  size?: "lg" | "md";
  action?: ReactNode;
  id?: string;
  className?: string;
};

/** Заголовок секции с подводкой — повторяющийся паттерн дизайна. */
export function SectionIntro({ title, text, tone = "light", size = "lg", action, id, className }: Props) {
  return (
    <Reveal
      className={cn(
        "flex",
        action ? "flex-wrap items-start justify-between gap-6" : "flex-col items-start gap-5",
        className,
      )}
    >
      <div className="flex flex-col gap-5">
        <h2
          id={id}
          className={cn("m-0", size === "lg" ? "heading-2" : "heading-2-sm", tone === "light" && "text-navy-950")}
        >
          {title}
        </h2>
        {text && action ? (
          <p className={cn("m-0 max-w-[480px] lead-text", tone === "light" ? "text-muted" : "text-white/70")}>{text}</p>
        ) : null}
      </div>
      {text && !action ? (
        <p className={cn("m-0 max-w-[480px] lead-text", tone === "light" ? "text-muted" : "text-white/70")}>{text}</p>
      ) : null}
      {action}
    </Reveal>
  );
}
