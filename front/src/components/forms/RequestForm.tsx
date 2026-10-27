"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type DragEvent, useState } from "react";
import { useForm } from "react-hook-form";

import { useLeadFiles, useLeadSubmit } from "@/features/leads/hooks";
import { ACCEPT_ATTR, MAX_FILE_MB, type RequestValues, requestResolver } from "@/features/leads/schema";
import { cn, formatBytes } from "@/lib/utils";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import type { RequestDirection } from "@/types/content";

type Props = {
  directions: (RequestDirection & { service_id: number | null })[];
  partnerNote: string;
  success: { title: string; text: string };
  email: string;
};

const inputClass =
  "h-[54px] rounded-[4px] border bg-paper px-4 text-base text-navy-950 outline-none transition-colors focus:border-accent focus:bg-white";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-navy-950">
        {label} {required ? <span className="text-accent">*</span> : null}
      </span>
      {children}
      {error ? <span className="text-[13px] text-danger">{error}</span> : null}
    </label>
  );
}

const legendClass = "pb-4 text-xl font-semibold tracking-[-.01em] text-navy-950";

export function RequestForm({ directions, partnerNote, success, email }: Props) {
  const reduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const preselected = Math.max(
    0,
    directions.findIndex((d) => d.service_slug && d.service_slug === searchParams.get("service")),
  );
  const [direction, setDirection] = useState(preselected);
  const [tried, setTried] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { files, add, remove, clear, hasProblems } = useLeadFiles();
  const { status, setStatus, error, ticket, submit } = useLeadSubmit();
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<RequestValues>({
    resolver: requestResolver,
    defaultValues: { name: "", company: "", phone: "", email: "", description: "", consent: false },
  });

  const current = directions[direction];

  const send = async (values: RequestValues) => {
    if (hasProblems) return;
    await submit(
      {
        ...values,
        service_id: current?.service_id ?? null,
        service_label: current?.label ?? "",
      },
      files.map((f) => f.file),
    );
  };

  const onSubmit = handleSubmit(send);
  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setTried(true);
    void onSubmit(e);
  };

  const contactError = errors.phone?.message === "Оставьте телефон или почту";
  const messages = [
    errors.name && "укажите имя",
    contactError && "оставьте телефон или почту",
    errors.phone && !contactError && "проверьте номер телефона",
    errors.email && "проверьте e-mail",
    hasProblems && `уберите файлы больше ${MAX_FILE_MB} МБ или неподдерживаемого формата`,
    errors.consent && "отметьте согласие на обработку персональных данных",
  ].filter(Boolean);

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    add(e.dataTransfer.files);
  };

  const fade = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -6 },
    transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0.7, 0.2, 1] as const },
  };

  return (
    <div className="relative flex flex-col gap-9 bg-white p-[clamp(24px,4vw,56px)]">
      <AnimatePresence mode="wait" initial={false}>
        {status === "form" ? (
          <m.form key="form" {...fade} noValidate onSubmit={onFormSubmit} className="flex flex-col gap-9">
            {tried && messages.length ? (
              <div
                role="alert"
                className="rounded-[4px] border border-danger-line bg-danger-bg px-[18px] py-4 text-[15px] leading-normal text-[#8a1f1f]"
              >
                Чтобы отправить заявку: {messages.join(", ")}.
              </div>
            ) : null}

            <fieldset className="m-0 flex flex-col gap-5 border-0 p-0">
              <legend className={legendClass}>Контакты</legend>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-5">
                <Field label="Имя" required error={errors.name?.message}>
                  <input
                    {...register("name")}
                    autoComplete="name"
                    placeholder="Как к вам обращаться"
                    aria-invalid={!!errors.name}
                    className={cn(inputClass, errors.name ? "border-danger" : "border-line")}
                  />
                </Field>
                <Field label="Компания">
                  <input
                    {...register("company")}
                    autoComplete="organization"
                    placeholder="Необязательно"
                    className={cn(inputClass, "border-line")}
                  />
                </Field>
                <Field label="Телефон" error={errors.phone && !contactError ? errors.phone.message : undefined}>
                  <input
                    {...register("phone")}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+7 ___ ___-__-__"
                    aria-invalid={!!errors.phone}
                    className={cn(inputClass, errors.phone ? "border-danger" : "border-line")}
                  />
                </Field>
                <Field label="Эл. почта" error={errors.email?.message}>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.ru"
                    aria-invalid={!!errors.email || contactError}
                    className={cn(inputClass, errors.email || contactError ? "border-danger" : "border-line")}
                  />
                </Field>
              </div>
              <span className={cn("text-[13px]", contactError ? "text-danger" : "text-muted")}>
                Телефон или почта — достаточно одного
              </span>
            </fieldset>

            <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
              <legend className={legendClass}>Направление</legend>
              <div className="flex flex-wrap gap-2">
                {directions.map((d, index) => {
                  const on = index === direction;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDirection(index)}
                      className={cn(
                        "h-11 cursor-pointer rounded-[4px] border px-4 font-[inherit] text-[15px] transition-[background-color,border-color] duration-200",
                        on
                          ? "border-navy-950 bg-navy-950 text-white"
                          : "border-line bg-white text-navy-950 hover:border-navy-950",
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence initial={false}>
                {current?.is_partner ? (
                  <m.span
                    key="partner"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden text-[13px] leading-normal text-muted"
                  >
                    {partnerNote}
                  </m.span>
                ) : null}
              </AnimatePresence>
            </fieldset>

            <fieldset className="m-0 flex flex-col gap-5 border-0 p-0">
              <legend className={legendClass}>Задача</legend>
              <Field label="Описание" error={errors.description?.message}>
                <textarea
                  {...register("description")}
                  rows={5}
                  placeholder="Тип объекта, габариты, ориентировочный объём, сроки, адрес объекта"
                  className="resize-y rounded-[4px] border border-line bg-paper px-4 py-3.5 text-base leading-[1.55] text-navy-950 transition-colors outline-none focus:border-accent focus:bg-white"
                />
              </Field>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "relative flex cursor-pointer flex-col items-start gap-3 rounded-[4px] border border-dashed bg-paper p-6 transition-colors duration-200 focus-within:border-accent hover:border-accent",
                  tried && hasProblems ? "border-danger" : dragOver ? "border-accent" : "border-[#9fb2c6]",
                )}
              >
                <input
                  type="file"
                  multiple
                  accept={ACCEPT_ATTR}
                  className="sr-only"
                  onChange={(e) => {
                    add(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className="text-base font-medium text-navy-950">Прикрепить чертежи или ТЗ</span>
                <span className="text-[13px] leading-normal text-muted">
                  PDF, DWG, DXF, JPG, PNG, ZIP — до {MAX_FILE_MB} МБ на файл
                </span>
                <span className="text-[13px] text-accent">Выбрать файлы →</span>
              </label>
              {files.length ? (
                <ul className="m-0 flex list-none flex-col border-t border-line p-0">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-4 border-b border-line py-3 text-sm"
                    >
                      <span className="truncate text-navy-950">{f.file.name}</span>
                      <span className="flex flex-none items-center gap-4">
                        <span className={cn("text-[13px]", f.problem ? "text-danger" : "text-muted")}>
                          {f.problem ?? formatBytes(f.file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(f.id)}
                          aria-label={`Удалить файл ${f.file.name}`}
                          className="size-8 cursor-pointer rounded-[4px] border border-line bg-white text-muted hover:border-navy-950 hover:text-navy-950"
                        >
                          ×
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-5 border-t border-mist pt-2">
              <div className="max-w-[460px]">
                <ConsentCheckbox registration={register("consent")} error={errors.consent?.message} />
              </div>
              <button
                type="submit"
                className="flex h-[58px] cursor-pointer items-center gap-3.5 rounded-[4px] border-0 bg-navy-950 px-[30px] font-[inherit] text-base font-semibold text-white transition-colors duration-200 hover:bg-accent"
              >
                Отправить заявку →
              </button>
            </div>
          </m.form>
        ) : null}

        {status === "loading" ? (
          <m.div
            key="loading"
            {...fade}
            aria-live="polite"
            className="flex min-h-[560px] flex-col justify-center gap-7"
          >
            <div className="relative h-0.5 max-w-[420px] overflow-hidden bg-mist">
              <div className="absolute inset-y-0 left-0 w-2/5 animate-[rms-bar_1.1s_ease-in-out_infinite] bg-accent" />
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] text-accent-dark">Отправка</span>
              <span className="text-[32px] font-semibold tracking-[-.02em] text-navy-950">
                {files.length ? "Загружаем файлы и заявку" : "Отправляем заявку"}
              </span>
              <span className="text-[15px] text-muted">Не закрывайте страницу — это займёт несколько секунд.</span>
            </div>
          </m.div>
        ) : null}

        {status === "success" ? (
          <m.div
            key="success"
            {...fade}
            aria-live="polite"
            className="flex min-h-[560px] flex-col justify-center gap-9"
          >
            <div className="flex size-16 items-center justify-center rounded-[4px] border border-accent text-[28px] text-accent">
              ✓
            </div>
            <div className="flex max-w-[560px] flex-col gap-3.5">
              <span className="text-[13px] text-accent-dark">Заявка № {ticket}</span>
              <span className="text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-semibold tracking-[-.03em] text-navy-950">
                {success.title}
              </span>
              <span className="text-[17px] leading-relaxed text-muted">{success.text}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/projects"
                className="flex h-[54px] items-center rounded-[4px] bg-navy-950 px-6 font-semibold text-white no-underline hover:bg-accent hover:text-white"
              >
                Смотреть проекты →
              </Link>
              <button
                type="button"
                onClick={() => {
                  reset();
                  clear();
                  setTried(false);
                  setStatus("form");
                }}
                className="h-[54px] cursor-pointer rounded-[4px] border border-navy-950 bg-transparent px-6 font-[inherit] font-medium text-navy-950 hover:bg-navy-950 hover:text-white"
              >
                Новая заявка
              </button>
            </div>
          </m.div>
        ) : null}

        {status === "failed" ? (
          <m.div key="failed" {...fade} role="alert" className="flex min-h-[560px] flex-col justify-center gap-9">
            <div className="flex size-16 items-center justify-center rounded-[4px] border border-danger text-[28px] text-danger">
              !
            </div>
            <div className="flex max-w-[560px] flex-col gap-3.5">
              <span className="text-[13px] text-danger">Сбой отправки</span>
              <span className="text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-semibold tracking-[-.03em] text-navy-950">
                Заявка не отправлена
              </span>
              <span className="text-[17px] leading-relaxed text-muted">
                {error ? `${error} ` : ""}Введённые данные сохранены. Повторите попытку или напишите нам напрямую —
                приложите те же файлы.
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void send(getValues())}
                className="h-[54px] cursor-pointer rounded-[4px] border-0 bg-navy-950 px-6 font-[inherit] font-semibold text-white hover:bg-accent"
              >
                Повторить отправку
              </button>
              <button
                type="button"
                onClick={() => setStatus("form")}
                className="h-[54px] cursor-pointer rounded-[4px] border border-navy-950 bg-transparent px-6 font-[inherit] font-medium text-navy-950 hover:bg-navy-950 hover:text-white"
              >
                Вернуться к форме
              </button>
              <a href={`mailto:${email}`} className="flex h-[54px] items-center px-2 font-medium no-underline">
                {email}
              </a>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
