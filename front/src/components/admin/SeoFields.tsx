"use client";

import { Field, Input, Textarea } from "./ui";

type Props = {
  title: string;
  description: string;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  fallbackTitle?: string;
};

/** SEO-поля с подсказкой по длине и предпросмотром сниппета. */
export function SeoFields({ title, description, onTitle, onDescription, fallbackTitle }: Props) {
  const shownTitle = title || fallbackTitle || "";
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="SEO-заголовок (title)"
        hint={`${title.length} / 60 символов. Пусто — используется заголовок страницы.`}
      >
        <Input value={title} maxLength={255} onChange={(e) => onTitle(e.target.value)} />
      </Field>
      <Field label="SEO-описание (description)" hint={`${description.length} / 160 символов`}>
        <Textarea rows={3} value={description} maxLength={500} onChange={(e) => onDescription(e.target.value)} />
      </Field>
      <div className="rounded-[4px] bg-paper p-3">
        <div className="text-xs text-muted">Предпросмотр в поиске</div>
        <div className="mt-1 truncate text-[17px] text-[#1a0dab]">{shownTitle} — Росметстрой</div>
        <div className="line-clamp-2 text-[13px] text-[#4d5156]">
          {description || "Описание не задано — поисковик возьмёт фрагмент текста страницы."}
        </div>
      </div>
    </div>
  );
}
