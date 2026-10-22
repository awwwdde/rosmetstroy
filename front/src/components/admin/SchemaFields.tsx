"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ImageUrlField } from "./MediaPicker";
import { Button, Field, Input, Textarea, Toggle, surface } from "./ui";

/** Описание поля шаблона секции. Шаблоны задают, что редактор может менять на странице. */
export type FieldDef =
  | { key: string; label: string; type: "text" | "textarea" | "url" | "image" | "document" | "boolean"; hint?: string }
  | { key: string; label: string; type: "list"; fields: FieldDef[]; itemTitle?: string; max?: number }
  | { key: string; label: string; type: "group"; fields: FieldDef[] };

type Json = Record<string, unknown>;

function emptyValue(def: FieldDef): unknown {
  switch (def.type) {
    case "boolean":
      return false;
    case "list":
      return [];
    case "group":
      return emptyItem(def.fields);
    default:
      return "";
  }
}

export function emptyItem(fields: FieldDef[]): Json {
  return Object.fromEntries(fields.map((f) => [f.key, emptyValue(f)]));
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Повторяющийся список объектов: добавление, удаление, порядок. */
export function Repeater({
  label,
  value,
  onChange,
  fields,
  itemTitle,
  max,
}: {
  label: string;
  value: Json[];
  onChange: (value: Json[]) => void;
  fields: FieldDef[];
  itemTitle?: string;
  max?: number;
}) {
  const items = Array.isArray(value) ? value : [];
  return (
    <fieldset className="m-0 flex flex-col gap-3 rounded-[10px] border border-[#e3e9f0] p-3">
      <legend className="px-1 text-[13px] font-medium text-navy-950">
        {label} <span className="font-normal text-muted">({items.length})</span>
      </legend>
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-[8px] bg-[#f6f8fb] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-muted">
              {index + 1}. {String((itemTitle && item[itemTitle]) || "")}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                className="h-8 px-2"
                aria-label="Выше"
                disabled={index === 0}
                onClick={() => onChange(move(items, index, index - 1))}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 px-2"
                aria-label="Ниже"
                disabled={index === items.length - 1}
                onClick={() => onChange(move(items, index, index + 1))}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 px-2 text-danger"
                aria-label="Удалить"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <SchemaFields
            fields={fields}
            value={item}
            onChange={(next) => onChange(items.map((it, i) => (i === index ? next : it)))}
          />
        </div>
      ))}
      {max === undefined || items.length < max ? (
        <Button variant="secondary" className="self-start" onClick={() => onChange([...items, emptyItem(fields)])}>
          <Plus className="size-4" aria-hidden="true" />
          Добавить
        </Button>
      ) : null}
    </fieldset>
  );
}

/**
 * Блок страницы верхнего уровня: сворачиваемая карточка с переключателем видимости.
 * Скрытый блок хранится с флагом hidden и не выводится на сайте, но его содержимое сохраняется.
 */
function BlockCard({
  def,
  value,
  onChange,
  hideable,
  defaultOpen,
}: {
  def: Extract<FieldDef, { type: "group" }>;
  value: Json;
  onChange: (value: Json) => void;
  hideable: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const hidden = Boolean(value.hidden);
  return (
    <section className={cn(surface, "overflow-hidden transition-opacity", hidden && "opacity-70")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left font-[inherit]"
        >
          <ChevronDown
            className={cn("size-4 flex-none text-muted transition-transform duration-200", !open && "-rotate-90")}
            aria-hidden="true"
          />
          <span className="truncate text-[15px] font-semibold text-navy-950">{def.label}</span>
          {hidden ? (
            <span className="flex-none rounded-full bg-[#eef2f6] px-2 py-0.5 text-[11px] text-muted">Скрыт</span>
          ) : null}
        </button>
        {hideable ? (
          <Toggle label="На сайте" checked={!hidden} onChange={(visible) => onChange({ ...value, hidden: !visible })} />
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#eef2f6] p-4">
              <SchemaFields fields={def.fields} value={value} onChange={onChange} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

/** Редактор секций страницы: каждый блок — отдельная карточка, кроме первого экрана блоки можно скрывать. */
export function PageBlocks({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: Json;
  onChange: (value: Json) => void;
}) {
  const loose = fields.filter((f) => f.type !== "group");
  return (
    <div className="flex flex-col gap-3">
      {fields.map((def, index) =>
        def.type === "group" ? (
          <BlockCard
            key={def.key}
            def={def}
            value={(value?.[def.key] as Json) ?? {}}
            onChange={(v) => onChange({ ...value, [def.key]: v })}
            hideable={def.key !== "hero"}
            defaultOpen={index === 0}
          />
        ) : null,
      )}
      {loose.length ? (
        <section className={cn(surface, "p-4")}>
          <SchemaFields fields={loose} value={value} onChange={onChange} />
        </section>
      ) : null}
    </div>
  );
}

/** Рекурсивный редактор JSON-объекта по описанию полей. */
export function SchemaFields({
  fields,
  value,
  onChange,
}: {
  fields: FieldDef[];
  value: Json;
  onChange: (value: Json) => void;
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-col gap-3">
      {fields.map((def) => {
        const current = value?.[def.key];
        switch (def.type) {
          case "text":
          case "url":
            return (
              <Field key={def.key} label={def.label} hint={def.hint}>
                <Input value={String(current ?? "")} onChange={(e) => set(def.key, e.target.value)} />
              </Field>
            );
          case "textarea":
            return (
              <Field key={def.key} label={def.label} hint={def.hint}>
                <Textarea rows={3} value={String(current ?? "")} onChange={(e) => set(def.key, e.target.value)} />
              </Field>
            );
          case "boolean":
            return (
              <Toggle key={def.key} label={def.label} checked={Boolean(current)} onChange={(v) => set(def.key, v)} />
            );
          case "image":
          case "document":
            return (
              <ImageUrlField
                key={def.key}
                kind={def.type}
                label={def.label}
                value={String(current ?? "")}
                onChange={(v) => set(def.key, v)}
              />
            );
          case "list":
            return (
              <Repeater
                key={def.key}
                label={def.label}
                value={(current as Json[]) ?? []}
                onChange={(v) => set(def.key, v)}
                fields={def.fields}
                itemTitle={def.itemTitle}
                max={def.max}
              />
            );
          case "group":
            return (
              <fieldset key={def.key} className="m-0 flex flex-col gap-3 rounded-[10px] border border-[#e3e9f0] p-3">
                <legend className="px-1 text-[13px] font-medium text-navy-950">{def.label}</legend>
                <SchemaFields fields={def.fields} value={(current as Json) ?? {}} onChange={(v) => set(def.key, v)} />
              </fieldset>
            );
        }
      })}
    </div>
  );
}
