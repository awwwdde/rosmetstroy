export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export function formatDate(value: string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : "";
}

export function formatBytes(bytes: number): string {
  return bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
}

/** Склонение: plural(5, ["минута", "минуты", "минут"]) */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const isExternal = (href: string) => /^(https?:)?\/\//.test(href);

/** Блок страницы показывается, если он есть и не скрыт в CMS переключателем «На сайте». */
export function shown<T>(section: T | null | undefined): section is T {
  return Boolean(section) && !(section as { hidden?: boolean }).hidden;
}
