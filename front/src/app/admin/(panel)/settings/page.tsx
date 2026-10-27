"use client";

import { ExternalLink } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { SchemaFields } from "@/components/admin/SchemaFields";
import { Button, ErrorState, Loading, PageHeader, surface } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { SETTINGS_SECTIONS } from "@/features/admin/settings-sections";
import { toast } from "@/features/admin/toast-store";
import type { Setting } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, error, loading, reload } = useResource<Setting>("/admin/settings/site?locale=ru");
  const [value, setValue] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(SETTINGS_SECTIONS[0].id);
  const reduceMotion = useReducedMotion();

  const [source, setSource] = useState<Setting | null>(null);
  if (data && data !== source) {
    setSource(data);
    setValue(structuredClone(data.value));
  }

  const dirty = Boolean(value && source && JSON.stringify(value) !== JSON.stringify(source.value));

  // Не даём случайно уйти со страницы с несохранёнными правками
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!isAdmin) return authLoading ? <Loading /> : <ErrorState message="Раздел доступен только администраторам." />;
  if (loading && !value) return <Loading />;
  if (error || !value) return <ErrorState message={error ?? "Настройки не найдены"} onRetry={reload} />;

  const section = SETTINGS_SECTIONS.find((s) => s.id === active) ?? SETTINGS_SECTIONS[0];

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.put<Setting>("/admin/settings/site?locale=ru", { value });
      setSource(saved);
      setValue(structuredClone(saved.value));
      toast.success("Настройки сохранены — изменения уже на сайте");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Настройки сайта"
        description="Всё, что одинаково на всех страницах: контакты, меню, подвал, документы, cookie и SEO"
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Разделы: на телефоне — прокручиваемая строка, на десктопе — столбец */}
        <nav aria-label="Разделы настроек" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SETTINGS_SECTIONS.map((s) => {
              const Icon = s.icon;
              const current = s.id === section.id;
              return (
                <li key={s.id} className="flex-none">
                  <button
                    type="button"
                    onClick={() => setActive(s.id)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-2.5 text-left font-[inherit] transition-colors",
                      current
                        ? "border-accent/40 bg-[#eef5ff] text-navy-950"
                        : "border-transparent bg-transparent text-muted hover:bg-white hover:text-navy-950",
                    )}
                  >
                    <Icon
                      className={cn("mt-0.5 size-[18px] flex-none", current ? "text-accent" : "text-[#8a97a5]")}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col whitespace-nowrap lg:whitespace-normal">
                      <span className="text-sm font-medium">{s.title}</span>
                      <span className="hidden text-xs leading-snug text-muted lg:block">{s.summary}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={section.id}
            aria-labelledby="settings-section-title"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className={cn(surface, "flex flex-col gap-5 p-5 sm:p-6")}
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef2f6] pb-4">
              <div className="flex flex-col gap-1">
                <h2 id="settings-section-title" className="m-0 text-lg font-semibold text-navy-950">
                  {section.title}
                </h2>
                <p className="m-0 max-w-[620px] text-sm leading-normal text-muted">{section.where}</p>
              </div>
              <a
                href={section.preview}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm no-underline"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> Посмотреть на сайте
              </a>
            </header>
            <SchemaFields fields={section.fields} value={value} onChange={setValue} />
          </motion.section>
        </AnimatePresence>
      </div>

      {/* Панель сохранения появляется, как только есть изменения, и видна в любом разделе */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-navy-950 px-5 py-3 text-white shadow-[0_12px_32px_rgba(7,29,54,.25)]"
            role="status"
          >
            <span className="text-sm">Есть несохранённые изменения</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => source && setValue(structuredClone(source.value))}
              >
                Отменить
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                Сохранить
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
