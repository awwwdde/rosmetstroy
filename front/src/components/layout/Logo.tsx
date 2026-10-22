import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Цвета знака из брендбука. */
const BRAND = { navy: "#0A2540", blue: "#0077FF", light: "#3FA0FF" };

// На тёмном фоне тёмно-синий элемент знака заменяется белым, синие сохраняются
const TONES = {
  dark: ["#FFFFFF", BRAND.blue, BRAND.light],
  light: [BRAND.navy, BRAND.blue, BRAND.light],
  mono: ["#FFFFFF", "#FFFFFF", "#FFFFFF"],
} as const;

/** Знак «Росметстрой»: три диагональных элемента, геометрия из SVG брендбука. */
export function BrandMark({ tone = "dark", className }: { tone?: keyof typeof TONES; className?: string }) {
  const [a, b, c] = TONES[tone];
  return (
    <svg viewBox="12 2 182 110" aria-hidden="true" className={cn("h-[26px] w-auto flex-none", className)}>
      <polygon points="12,112 12,76 86,2 86,38" fill={a} />
      <polygon points="78,112 78,82 145,15 145,45" fill={b} />
      <polygon points="140,112 140,88 194,34 194,58" fill={c} />
    </svg>
  );
}

type Props = {
  name: string;
  /** Логотип, загруженный в CMS («Настройки сайта»), заменяет фирменный */
  logoUrl?: string;
  tone?: "dark" | "light";
  onClick?: () => void;
  className?: string;
};

export function Logo({ name, logoUrl, tone = "dark", onClick, className }: Props) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={`${name} — на главную`}
      className={cn("flex items-center gap-3 no-underline", className)}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={200} height={32} className="h-8 w-auto" unoptimized />
      ) : (
        <>
          <BrandMark tone={tone} />
          {/* Надпись в кривых из брендбука (Inter ExtraBold) — не зависит от загрузки шрифта */}
          <Image
            src={tone === "dark" ? "/brand/wordmark-white.svg" : "/brand/wordmark-navy.svg"}
            alt=""
            width={534}
            height={70}
            priority
            unoptimized
            className="h-[19px] w-auto"
          />
        </>
      )}
    </Link>
  );
}
