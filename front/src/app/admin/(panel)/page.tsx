"use client";

import { ArrowRight, FilePenLine, FolderKanban, Inbox, Newspaper, Plus, Wrench } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";

import { CountUp } from "@/components/admin/CountUp";
import { StatusBadge, relativeTime } from "@/components/admin/StatusBadge";
import { ErrorState, LinkButton, Skeleton, surface } from "@/components/admin/ui";
import { useAuth } from "@/features/admin/auth";
import { CREATE_ACTIONS } from "@/features/admin/navigation";
import { type Dashboard, LEAD_STATUSES } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { cn, plural } from "@/lib/utils";

const ease = [0.2, 0.7, 0.2, 1] as const;
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function Kpi({
  label,
  value,
  hint,
  href,
  accent,
  index,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  accent?: boolean;
  index: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease }}
    >
      <Link
        href={href}
        className={cn(
          "group flex h-full flex-col gap-3 rounded-[14px] p-5 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
          accent
            ? "bg-[linear-gradient(135deg,#0a2747,#103d70)] text-white shadow-[0_8px_24px_-12px_rgba(7,29,54,.6)] hover:text-white"
            : cn(surface, "text-navy-950 hover:text-navy-950 hover:shadow-[0_8px_24px_-14px_rgba(7,29,54,.25)]"),
        )}
      >
        <span className={cn("text-[13px]", accent ? "text-sky" : "text-muted")}>{label}</span>
        <CountUp value={value} className="text-[34px] leading-none font-semibold tracking-[-.03em] tabular-nums" />
        <span
          className={cn(
            "mt-auto flex items-center gap-1 text-xs",
            accent ? "text-white/60 group-hover:text-white" : "text-muted group-hover:text-accent",
          )}
        >
          {hint}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </motion.div>
  );
}

function LeadsChart({ data }: { data: Dashboard["leads_daily"] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <section className={cn(surface, "flex flex-col gap-5 p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-[15px] font-semibold text-navy-950">Заявки за 14 дней</h2>
          <p className="m-0 text-[13px] text-muted">
            {total} {plural(total, ["заявка", "заявки", "заявок"])}
          </p>
        </div>
      </div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Заявки по дням, всего ${total}`}>
        {data.map((d, i) => {
          const h = d.count ? Math.max(8, (d.count / max) * 100) : 3;
          const today = i === data.length - 1;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-[6px] bg-navy-950 px-2 py-1 text-[11px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                {dayFmt.format(new Date(d.date))}: {d.count}
              </span>
              <motion.div
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.03, ease }}
                style={{ height: `${h}%`, transformOrigin: "bottom" }}
                className={cn(
                  "w-full rounded-[5px] transition-colors",
                  d.count ? (today ? "bg-accent" : "bg-[#9cc8ff] group-hover:bg-accent") : "bg-[#e9eef4]",
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-placeholder">
        <span>{data[0] ? dayFmt.format(new Date(data[0].date)) : ""}</span>
        <span>сегодня</span>
      </div>
    </section>
  );
}

function StatusBreakdown({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const reduce = useReducedMotion();
  return (
    <section className={cn(surface, "flex flex-col gap-5 p-5")}>
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-[15px] font-semibold text-navy-950">Воронка заявок</h2>
        <p className="m-0 text-[13px] text-muted">Распределение по статусам</p>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[#e9eef4]">
        {total
          ? LEAD_STATUSES.map((s, i) => {
              const share = (byStatus[s.value] ?? 0) / total;
              if (!share) return null;
              return (
                <motion.span
                  key={s.value}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${share * 100}%` }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.05, ease }}
                  style={{ background: s.color }}
                  className="h-full"
                />
              );
            })
          : null}
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-1 p-0">
        {LEAD_STATUSES.map((s) => (
          <li key={s.value}>
            <Link
              href={`/admin/leads?status=${s.value}`}
              className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-navy-950 no-underline hover:bg-[#f4f7fa] hover:text-navy-950"
            >
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="text-muted tabular-nums">{byStatus[s.value] ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Загрузка">
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[132px] rounded-[14px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[270px] rounded-[12px]" />
        <Skeleton className="h-[270px] rounded-[12px]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useResource<Dashboard>("/admin/dashboard");

  if (loading && !data) return <DashboardSkeleton />;
  if (error || !data) return <ErrorState message={error ?? "Нет данных"} onRetry={reload} />;

  const firstName = (user?.full_name || "").split(" ")[0];
  const last14 = data.leads_daily.reduce((s, d) => s + d.count, 0);
  const drafts = data.drafts.services + data.drafts.projects + data.drafts.articles + data.drafts.pages;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted first-letter:uppercase">{longDate.format(new Date())}</span>
          <h1 className="m-0 text-[28px] leading-tight font-semibold tracking-[-.025em] text-navy-950">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <LinkButton href="/admin/leads?status=new" variant="primary">
          <Inbox className="size-4" aria-hidden="true" />
          Разобрать новые заявки
        </LinkButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          index={0}
          accent
          label="Новые заявки"
          value={data.leads_new}
          hint="Ждут ответа"
          href="/admin/leads?status=new"
        />
        <Kpi index={1} label="За 14 дней" value={last14} hint="Все заявки" href="/admin/leads" />
        <Kpi index={2} label="Всего заявок" value={data.leads_total} hint="Архив обращений" href="/admin/leads" />
        <Kpi index={3} label="Черновики" value={drafts} hint="Не опубликованы" href="/admin/projects" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <LeadsChart data={data.leads_daily} />
        <StatusBreakdown byStatus={data.leads_by_status} total={data.leads_total} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className={cn(surface, "flex flex-col overflow-hidden")}>
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
            <h2 className="m-0 text-[15px] font-semibold text-navy-950">Последние заявки</h2>
            <Link href="/admin/leads" className="flex items-center gap-1 text-[13px] no-underline">
              Все заявки <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          {data.recent_leads.length ? (
            <ul className="m-0 list-none p-0">
              {data.recent_leads.map((lead) => (
                <li key={String(lead.id)} className="border-t border-[#eef2f6]">
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-navy-950 no-underline transition-colors hover:bg-[#f7f9fc] hover:text-navy-950"
                  >
                    <span className="flex size-9 flex-none items-center justify-center rounded-full bg-[#eef3f8] text-xs font-semibold text-navy-800">
                      {initials(String(lead.name)) || "?"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{String(lead.name)}</span>
                      <span className="truncate text-xs text-muted">
                        {String(lead.number)} · {String(lead.service_label || "Без направления")}
                      </span>
                    </span>
                    <StatusBadge status={String(lead.status)} className="hidden sm:inline-flex" />
                    <span className="w-24 text-right text-xs text-muted">{relativeTime(String(lead.created_at))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#eef3f8] text-muted">
                <Inbox className="size-5" aria-hidden="true" />
              </span>
              <p className="m-0 text-sm font-medium text-navy-950">Заявок пока нет</p>
              <p className="m-0 max-w-xs text-[13px] text-muted">Новые обращения с сайта появятся здесь.</p>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className={cn(surface, "flex flex-col gap-3 p-5")}>
            <h2 className="m-0 text-[15px] font-semibold text-navy-950">Контент сайта</h2>
            {[
              {
                label: "Услуги",
                icon: Wrench,
                total: data.services,
                drafts: data.drafts.services,
                href: "/admin/services",
              },
              {
                label: "Проекты",
                icon: FolderKanban,
                total: data.projects,
                drafts: data.drafts.projects,
                href: "/admin/projects",
              },
              {
                label: "Статьи",
                icon: Newspaper,
                total: data.articles,
                drafts: data.drafts.articles,
                href: "/admin/articles",
              },
            ].map(({ label, icon: Icon, total, drafts: d, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-sm text-navy-950 no-underline hover:bg-[#f4f7fa] hover:text-navy-950"
              >
                <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#eef3f8] text-navy-800">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex-1">{label}</span>
                {d ? (
                  <span className="flex items-center gap-1 rounded-full bg-[#fff3d9] px-2 py-0.5 text-[11px] text-[#8a5a00]">
                    <FilePenLine className="size-3" aria-hidden="true" />
                    {d} {plural(d, ["черновик", "черновика", "черновиков"])}
                  </span>
                ) : null}
                <span className="w-6 text-right text-muted tabular-nums">{total}</span>
              </Link>
            ))}
          </section>
          <section className={cn(surface, "flex flex-col gap-3 p-5")}>
            <h2 className="m-0 text-[15px] font-semibold text-navy-950">Быстрые действия</h2>
            <div className="grid gap-2">
              {CREATE_ACTIONS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-2.5 rounded-[10px] border border-dashed border-[#d3dce6] px-3 py-2.5 text-sm text-navy-950 no-underline transition-colors hover:border-accent hover:bg-[#f2f7ff] hover:text-navy-950"
                >
                  <Plus className="size-4 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
