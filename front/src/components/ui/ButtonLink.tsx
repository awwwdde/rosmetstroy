import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SmartLink } from "./SmartLink";

export type ButtonVariant = "light" | "ghostLight" | "dark" | "outlineDark" | "accent" | "outlineSky";
export type ButtonSize = "lg" | "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  light: "bg-white text-navy-950 font-semibold hover:bg-accent hover:text-white",
  ghostLight: "border border-white/40 text-white font-medium hover:border-white hover:text-white",
  dark: "bg-navy-950 text-white font-semibold hover:bg-accent hover:text-white",
  outlineDark: "border border-navy-950 text-navy-950 font-medium hover:bg-navy-950 hover:text-white",
  accent: "bg-accent text-white font-semibold hover:bg-accent-dark hover:text-white",
  outlineSky: "border border-sky/40 text-white hover:border-accent hover:bg-accent hover:text-white",
};

const sizes: Record<ButtonSize, string> = {
  lg: "h-[58px] px-7 gap-3.5 text-base",
  md: "h-[52px] px-6 gap-3 text-base",
  sm: "h-12 px-5 gap-3 text-[13px]",
};

export const buttonClass = (variant: ButtonVariant = "dark", size: ButtonSize = "lg", className?: string) =>
  cn(
    "inline-flex items-center rounded-[4px] no-underline transition-[background-color,color,border-color] duration-200",
    variants[variant],
    sizes[size],
    className,
  );

type Props = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: "→" | "↓" | null;
  className?: string;
};

export function ButtonLink({ href, children, variant = "dark", size = "lg", arrow = "→", className }: Props) {
  return (
    <SmartLink href={href} className={buttonClass(variant, size, className)}>
      {children}
      {arrow ? <span aria-hidden="true">{arrow}</span> : null}
    </SmartLink>
  );
}
