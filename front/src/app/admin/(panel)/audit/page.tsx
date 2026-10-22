"use client";

import { useState } from "react";

import { ErrorState, Loading, PageHeader, Pagination, Select } from "@/components/admin/ui";
import { qs } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import type { Audit, Paginated } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const ACTIONS: Record<string, string> = {
  login: "Вход",
  login_failed: "Неудачный вход",
  logout: "Выход",
  password_change: "Смена пароля",
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  upload: "Загрузка файла",
  status: "Смена статуса",
  comment: "Комментарий",
  download: "Скачивание файла",
};

const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium" });

export default function AuditPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const { data, error, loading, reload } = useResource<Paginated<Audit>>(
    isAdmin ? `/admin/audit${qs({ page, page_size: 50, action })}` : null,
  );

  if (!isAdmin) return authLoading ? <Loading /> : <ErrorState message="Раздел доступен только администраторам." />;

  return (
    <>
      <PageHeader title="Журнал действий" description="Входы, изменения контента, работа с заявками и файлами" />
      <Select
        value={action}
        onChange={(e) => (setAction(e.target.value), setPage(1))}
        className="max-w-[240px]"
        aria-label="Действие"
      >
        <option value="">Все действия</option>
        {Object.entries(ACTIONS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data ? (
        <div className="overflow-x-auto rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Время</th>
                <th className="px-4 py-3 font-medium">Пользователь</th>
                <th className="px-4 py-3 font-medium">Действие</th>
                <th className="px-4 py-3 font-medium">Объект</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className="border-b border-mist align-top last:border-b-0">
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">{date.format(new Date(a.created_at))}</td>
                  <td className="px-4 py-2.5">{a.user?.email ?? String(a.meta.email ?? "—")}</td>
                  <td className={a.action === "login_failed" ? "px-4 py-2.5 text-danger" : "px-4 py-2.5"}>
                    {ACTIONS[a.action] ?? a.action}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {a.entity} {a.entity_id ? `#${a.entity_id}` : ""} {a.meta.title ? `«${String(a.meta.title)}»` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{a.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data ? <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}
    </>
  );
}
