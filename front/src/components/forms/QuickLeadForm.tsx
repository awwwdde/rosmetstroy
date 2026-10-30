"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { useFileDrop, useLeadFiles, useLeadSubmit } from "@/features/leads/hooks";
import { ACCEPT_ATTR, type QuickValues, quickResolver } from "@/features/leads/schema";
import { ConsentCheckbox } from "@/components/forms/ConsentCheckbox";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { cn, formatBytes } from "@/lib/utils";

const fieldClass =
  "h-[52px] rounded-[4px] border border-sky/25 bg-transparent px-4 text-base text-white outline-none transition-colors focus:border-accent";

type Props = { successTitle: string };

/** Короткая форма заявки в блоке CTA (главная, контакты). */
export function QuickLeadForm({ successTitle }: Props) {
  const reduceMotion = useReducedMotion();
  const { files, add, remove, clear, hasProblems } = useLeadFiles();
  const { dragOver, zone } = useFileDrop(add);
  const { status, setStatus, error, submit } = useLeadSubmit();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickValues>({
    resolver: quickResolver,
    defaultValues: { name: "", phone: "", description: "", consent: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (hasProblems) return;
    await submit(
      { ...values, service_label: "Заявка с сайта" },
      files.map((f) => f.file),
    );
  });

  const sent = status === "success";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <m.div
          key="sent"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col justify-center gap-4 rounded-[6px] border border-accent bg-navy-950 p-10"
          aria-live="polite"
        >
          <span className="text-[13px] text-sky">Заявка принята</span>
          <span className="text-[28px] font-semibold tracking-[-.02em]">{successTitle}</span>
          <Link href="/projects" className="text-sky no-underline hover:text-white">
            Пока посмотрите реализованные проекты →
          </Link>
          <button
            type="button"
            onClick={() => {
              reset();
              clear();
              setStatus("form");
            }}
            className="self-start border-0 bg-transparent p-0 text-sm text-white/60 underline underline-offset-4 hover:text-white"
          >
            Отправить ещё одну заявку
          </button>
        </m.div>
      ) : (
        <m.form
          key="form"
          noValidate
          onSubmit={onSubmit}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          className="flex flex-col gap-3 rounded-[6px] bg-navy-950 p-[clamp(24px,3vw,40px)]"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
            <label className="flex flex-col gap-2 text-[13px] text-white/60">
              Имя
              <input
                {...register("name")}
                autoComplete="name"
                placeholder="Как к вам обращаться"
                aria-invalid={!!errors.name}
                className={cn(fieldClass, errors.name && "border-danger")}
              />
              {errors.name ? <span className="text-[13px] text-[#ff8a80]">{errors.name.message}</span> : null}
            </label>
            <label className="flex flex-col gap-2 text-[13px] text-white/60">
              Телефон
              <PhoneInput
                registration={register("phone")}
                placeholder="+7 ___ ___-__-__"
                aria-invalid={!!errors.phone}
                className={cn(fieldClass, errors.phone && "border-danger")}
              />
              {errors.phone ? <span className="text-[13px] text-[#ff8a80]">{errors.phone.message}</span> : null}
            </label>
          </div>
          <label className="flex flex-col gap-2 text-[13px] text-white/60">
            Задача
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Тип объекта, объём, сроки"
              className="resize-y rounded-[4px] border border-sky/25 bg-transparent px-4 py-3.5 text-base text-white transition-colors outline-none focus:border-accent"
            />
          </label>
          <label
            {...zone}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-4 rounded-[4px] border border-dashed p-4 text-sm text-white/75 transition-colors focus-within:border-accent hover:border-accent",
              dragOver ? "border-accent bg-accent/10" : "border-sky/35",
            )}
          >
            <span>{dragOver ? "Отпустите, чтобы прикрепить" : "Прикрепить чертежи или ТЗ — можно перетащить"}</span>
            <span className="text-[13px] text-sky">PDF · DWG · DXF</span>
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
          </label>
          {files.length ? (
            <ul className="m-0 flex list-none flex-col p-0 text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 border-b border-sky/14 py-2">
                  <span className="truncate text-white/85">{f.file.name}</span>
                  <span className="flex flex-none items-center gap-3">
                    <span className={cn("text-[13px]", f.problem ? "text-[#ff8a80]" : "text-white/50")}>
                      {f.problem ?? formatBytes(f.file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Удалить ${f.file.name}`}
                      onClick={() => remove(f.id)}
                      className="size-7 cursor-pointer rounded-[4px] border border-sky/25 bg-transparent text-white/70 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {status === "failed" && error ? (
            <p
              role="alert"
              className="m-0 rounded-[4px] border border-danger-line/40 bg-danger/15 p-3 text-sm text-[#ffc9c4]"
            >
              {error}
            </p>
          ) : null}
          <ConsentCheckbox tone="dark" registration={register("consent")} error={errors.consent?.message} />
          <button
            type="submit"
            disabled={status === "loading" || hasProblems}
            className="mt-2 h-[58px] cursor-pointer rounded-[4px] border-0 bg-accent text-base font-semibold text-white transition-colors duration-200 hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Отправляем…" : "Отправить на расчёт →"}
          </button>
        </m.form>
      )}
    </AnimatePresence>
  );
}
