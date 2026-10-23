import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type InfoBlock = { key?: string; label: ReactNode; value: ReactNode };

const TONES = {
  light: {
    card: "border-line bg-white",
    label: "text-accent-dark",
    value: "text-navy-950",
  },
  paper: {
    card: "border-line bg-paper",
    label: "text-accent-dark",
    value: "text-navy-950",
  },
  dark: {
    card: "border-sky/16 bg-white/[.04]",
    label: "text-sky",
    value: "text-white",
  },
} as const;

/**
 * Пары «подпись — значение» карточками вместо таблицы: на любой ширине экрана подпись стоит
 * над значением, длинные адреса и e-mail переносятся внутри своей карточки и не наезжают на соседей.
 *
 * variant="title" — для пунктов «заголовок + пояснение» (состав работ): подпись крупнее, значение приглушено.
 */
export function InfoBlocks({
  items,
  tone = "light",
  variant = "pair",
  minWidth = 240,
  size = "md",
  stretch = false,
  className,
}: {
  items: InfoBlock[];
  tone?: keyof typeof TONES;
  variant?: "pair" | "title";
  /** Минимальная ширина карточки, px: от неё зависит число колонок */
  minWidth?: number;
  size?: "md" | "lg";
  /** Растянуть карточки на всю ширину, если их меньше, чем помещается колонок */
  stretch?: boolean;
  className?: string;
}) {
  if (!items.length) return null;
  const t = TONES[tone];
  return (
    <dl
      className={cn("m-0 grid gap-3", className)}
      style={{
        gridTemplateColumns: `repeat(${stretch ? "auto-fit" : "auto-fill"}, minmax(min(100%, ${minWidth}px), 1fr))`,
      }}
    >
      {items.map((item, index) => (
        <div key={item.key ?? index} className={cn("flex min-w-0 flex-col gap-2 rounded-[6px] border p-5", t.card)}>
          <dt
            className={cn(
              variant === "title" ? cn("text-base leading-snug font-medium", t.value) : cn("text-[13px]", t.label),
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              "m-0 leading-normal [overflow-wrap:anywhere]",
              variant === "title"
                ? cn("text-[15px]", tone === "dark" ? "text-white/70" : "text-muted")
                : cn(size === "lg" ? "text-[clamp(18px,1.6vw,22px)] font-medium" : "text-base", t.value),
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
