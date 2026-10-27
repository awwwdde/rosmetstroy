import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

/*
 * Проверка форм заявки без zod: правил немного, а библиотека добавила бы ~40 КБ на каждую
 * страницу сайта. Сообщения те же, что отдаёт backend.
 */

export const MAX_FILE_MB = 25;
export const MAX_FILES = 10;
export const ACCEPTED_EXTENSIONS = [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png", ".zip"];
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

export type RequestValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  description: string;
  consent: boolean;
};

export type QuickValues = {
  name: string;
  phone: string;
  description: string;
  consent: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function phoneProblem(value: string): string | null {
  if (value === "") return null;
  const digits = value.replace(/\D/g, "").length;
  if (!/^[\d\s+()-]+$/.test(value) || digits < 10 || digits > 15) return "Некорректный номер телефона";
  return null;
}

/** Отдельное согласие на обработку ПД (152-ФЗ, ст. 9): галочка не стоит по умолчанию */
const CONSENT_REQUIRED = "Без согласия на обработку персональных данных заявку отправить нельзя";

function makeResolver<T extends FieldValues>(check: (values: T) => Partial<Record<keyof T, string>>): Resolver<T> {
  return (raw) => {
    const values = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]),
    ) as T;
    const problems = check(values);
    const keys = Object.keys(problems) as (keyof T)[];
    if (!keys.length) return { values, errors: {} };
    const errors = Object.fromEntries(
      keys.map((key) => [key, { type: "validate", message: problems[key] }]),
    ) as FieldErrors<T>;
    return { values: {}, errors };
  };
}

export const requestResolver = makeResolver<RequestValues>((v) => {
  const e: Partial<Record<keyof RequestValues, string>> = {};
  if (!v.name) e.name = "Укажите имя";
  else if (v.name.length > 255) e.name = "Слишком длинное имя";
  if (v.company.length > 255) e.company = "Слишком длинное название";
  const phone = phoneProblem(v.phone);
  if (phone) e.phone = phone;
  if (v.email && !EMAIL_RE.test(v.email)) e.email = "Некорректный e-mail";
  if (!v.phone && !v.email) e.phone = "Оставьте телефон или почту";
  if (v.description.length > 5000) e.description = "Не больше 5000 символов";
  if (!v.consent) e.consent = CONSENT_REQUIRED;
  return e;
});

export const quickResolver = makeResolver<QuickValues>((v) => {
  const e: Partial<Record<keyof QuickValues, string>> = {};
  if (!v.name) e.name = "Укажите имя";
  else if (v.name.length > 255) e.name = "Слишком длинное имя";
  e.phone = v.phone ? (phoneProblem(v.phone) ?? undefined) : "Укажите телефон";
  if (!e.phone) delete e.phone;
  if (v.description.length > 5000) e.description = "Не больше 5000 символов";
  if (!v.consent) e.consent = CONSENT_REQUIRED;
  return e;
});

export function fileProblem(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return "НЕПОДДЕРЖИВАЕМЫЙ ФОРМАТ";
  if (file.size > MAX_FILE_MB * 1048576) return `БОЛЬШЕ ${MAX_FILE_MB} МБ`;
  return null;
}
