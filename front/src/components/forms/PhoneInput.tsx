"use client";

import type { ComponentProps } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { PHONE_PREFIX, formatPhone } from "@/features/leads/schema";

type Props = Omit<ComponentProps<"input">, "type" | "onChange" | "onBlur" | "onFocus" | "name" | "ref"> & {
  registration: UseFormRegisterReturn;
};

/** Позиция в строке после n-й цифры (курсор не прыгает в конец при правке середины номера) */
function caretAfterDigits(value: string, n: number): number {
  if (n <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i]) && ++seen === n) return i + 1;
  }
  return value.length;
}

/**
 * Телефон с маской «+7 999 123-45-67»: префикс +7 появляется при фокусе и не стирается при вводе,
 * пустой префикс при уходе из поля убирается — тогда поле считается незаполненным.
 */
export function PhoneInput({ registration, ...props }: Props) {
  const { onChange, onBlur, ...rest } = registration;

  const update = (input: HTMLInputElement, value: string) => {
    if (input.value === value) return;
    input.value = value;
    void onChange({ target: input, type: "change" });
  };

  return (
    <input
      {...props}
      {...rest}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      onFocus={(e) => {
        const input = e.currentTarget;
        if (!input.value) update(input, PHONE_PREFIX);
      }}
      onChange={(e) => {
        const input = e.currentTarget;
        const caret = input.selectionStart ?? input.value.length;
        const digitsBefore = input.value.slice(0, caret).replace(/\D/g, "").length;
        const atEnd = caret === input.value.length;
        input.value = formatPhone(input.value);
        const next = atEnd ? input.value.length : Math.max(PHONE_PREFIX.length, caretAfterDigits(input.value, digitsBefore));
        input.setSelectionRange(next, next);
        void onChange(e);
      }}
      onBlur={(e) => {
        const input = e.currentTarget;
        if (input.value.trim() === PHONE_PREFIX.trim()) update(input, "");
        void onBlur(e);
      }}
    />
  );
}
