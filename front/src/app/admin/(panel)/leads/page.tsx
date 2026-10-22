"use client";

import { Paperclip, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  EmptyState,
  ErrorState,
  Input,
  Loading,
  PageHeader,
  Pagination,
  SegmentedTabs,
  Select,
  surface,
} from "@/components/admin/ui";
import { qs } from "@/features/admin/api";
import { type Dashboard, LEAD_STATUSES, type LeadListItem, type Paginated } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export default function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get("status") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState("-created_at");

  const update = (patch: Record<string, string | number>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === 1) next.delete(k);
      else next.set(k, String(v));
    }
    router.replace(`${pathname}?${next.toString()}`);
  };

  // Поиск с задержкой, чтобы не отправлять запрос на каждый символ
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) update({ q, page: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Счётчики для вкладок статусов
  const { data: summary } = useResource<Dashboard>("/admin/dashboard");
  const { data, error, loading, reload } = useResource<Paginated<LeadListItem>>(
    `/admin/leads${qs({ status, q: params.get("q"), page, page_size: 25, sort })}`,
  );

  return (
    <>
      <PageHeader title="Заявки" description="Обращения с сайта: форма заявки и короткие формы на страницах" />
      <SegmentedTabs
        label="Статус заявки"
        value={status}
        onChange={(value) => update({ status: value, page: 1 })}
        items={[
          { value: "", label: "Все", count: summary?.leads_total },
          ...LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label, count: summary?.leads_by_status[s.value] })),
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-placeholder"
            aria-hidden="true"
          />
          <Input
            placeholder="Имя, компания, телефон, e-mail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            aria-label="Поиск по заявкам"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="max-w-[200px]"
          aria-label="Сортировка"
        >
          <option value="-created_at">Сначала новые</option>
          <option value="created_at">Сначала старые</option>
          <option value="status">По статусу</option>
        </Select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.items.length ? <EmptyState title="Заявок по заданным условиям нет." /> : null}
      {data?.items.length ? (
        <div className={`${surface} overflow-x-auto`}>
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Номер</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 font-medium">Контакты</th>
                <th className="px-4 py-3 font-medium">Направление</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => {
                return (
                  <tr key={lead.id} className="border-b border-mist last:border-b-0 hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium">
                        {lead.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-950">{lead.name}</div>
                      {lead.company ? <div className="text-xs text-muted">{lead.company}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div>{lead.phone}</div>
                      <div>{lead.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.service_label || "—"}
                      {lead.files_count ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted">
                          <Paperclip className="size-3" aria-hidden="true" />
                          {lead.files_count}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {dateTime.format(new Date(lead.created_at))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {data ? (
        <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={(p) => update({ page: p })} />
      ) : null}
    </>
  );
}
