import Link from "next/link";
import type { UseFormRegisterReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

/**
 * Согласие на обработку персональных данных — отдельной отметкой, не проставленной заранее
 * (152-ФЗ, ст. 9, ред. с 01.09.2025). Ссылки ведут на сам текст согласия и на политику.
 */
export function ConsentCheckbox({
  registration,
  error,
  tone = "light",
}: {
  registration: UseFormRegisterReturn;
  error?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const link = dark ? "text-white underline underline-offset-2 hover:text-sky" : "text-accent-dark hover:text-accent";
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 text-[13px] leading-normal",
          dark ? "text-white/70" : "text-muted",
        )}
      >
        <input
          type="checkbox"
          {...registration}
          aria-invalid={Boolean(error)}
          className={cn(
            "mt-0.5 size-[18px] flex-none cursor-pointer rounded-[3px]",
            dark ? "accent-sky" : "accent-navy-950",
          )}
        />
        <span>
          Даю{" "}
          <Link href="/consent" target="_blank" className={link}>
            согласие на обработку персональных данных
          </Link>{" "}
          и подтверждаю, что ознакомлен с{" "}
          <Link href="/privacy" target="_blank" className={link}>
            политикой обработки персональных данных
          </Link>
        </span>
      </label>
      {error ? (
        <span role="alert" className={cn("text-[13px]", dark ? "text-[#ffb4a8]" : "text-danger")}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
