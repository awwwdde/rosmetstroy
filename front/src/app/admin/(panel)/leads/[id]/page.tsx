"use client";

import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, ConfirmDialog, ErrorState, Loading, PageHeader, Select, Textarea } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { toast } from "@/features/admin/toast-store";
import { LEAD_STATUSES, type Lead, type LeadComment, type LeadStatus } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { formatBytes } from "@/lib/utils";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });

export default function LeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, setData, error, loading, reload } = useResource<Lead>(`/admin/leads/${id}`);
  const [comment, setComment] = useState("");
  const { user: me, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (loading && !lead) return <Loading />;
  if (error || !lead) return <ErrorState message={error ?? "Заявка не найдена"} onRetry={reload} />;

  const changeStatus = async (status: LeadStatus) => {
    try {
      setData(await api.patch<Lead>(`/admin/leads/${lead.id}/status`, { status }));
      toast.success("Статус обновлён");
    } catch (e) {
      toast.error(e);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      const created = await api.post<LeadComment>(`/admin/leads/${lead.id}/comments`, { body: comment.trim() });
      setData({ ...lead, comments: [...lead.comments, created] });
      setComment("");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (commentId: number) => {
    try {
      await api.del(`/admin/leads/${lead.id}/comments/${commentId}`);
      setData({ ...lead, comments: lead.comments.filter((c) => c.id !== commentId) });
      toast.success("Комментарий удалён");
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/admin/leads/${lead.id}`);
      toast.success("Заявка удалена");
      router.replace("/admin/leads");
    } catch (e) {
      toast.error(e);
    }
  };

  const rows = [
    ["Имя", lead.name],
    ["Компания", lead.company],
    ["Телефон", lead.phone],
    ["E-mail", lead.email],
    ["Направление", lead.service_label],
    ["Страница", lead.source_page],
    ["Получена", dateTime.format(new Date(lead.created_at))],
  ];

  return (
    <>
      <PageHeader
        title={`Заявка ${lead.number}`}
        description={lead.name}
        actions={
          <>
            <Link href="/admin/leads" className="inline-flex h-10 items-center text-sm no-underline">
              ← К списку
            </Link>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Удалить
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Данные клиента">
            <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="m-0 break-words text-navy-950">
                    {k === "Телефон" && v ? (
                      <a href={`tel:${v}`}>{v}</a>
                    ) : k === "E-mail" && v ? (
                      <a href={`mailto:${v}`}>{v}</a>
                    ) : (
                      v || "—"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Описание задачи">
            <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap text-navy-950">
              {lead.description || "Описание не указано."}
            </p>
          </Card>
          <Card title={`Файлы (${lead.files.length})`}>
            {lead.files.length ? (
              <ul className="m-0 flex list-none flex-col p-0">
                {lead.files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 border-t border-mist py-2 text-sm first:border-t-0"
                  >
                    <span className="truncate">{f.original_name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted">{formatBytes(f.size)}</span>
                      <a
                        href={`/api/v1/admin/leads/${lead.id}/files/${f.id}`}
                        className="inline-flex items-center gap-1.5 text-sm no-underline"
                        download
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Скачать
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted">Файлы не приложены.</p>
            )}
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Статус">
            <div className="flex items-center gap-3">
              <StatusBadge status={lead.status} />
              <Select
                value={lead.status}
                onChange={(e) => void changeStatus(e.target.value as LeadStatus)}
                aria-label="Изменить статус"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </Card>
          <Card title="Внутренние комментарии">
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {lead.comments.map((c) => (
                <li key={c.id} className="group rounded-[4px] bg-paper p-3 text-sm">
                  <div className="mb-1 flex items-start justify-between gap-2 text-xs text-muted">
                    <span>
                      {c.author?.full_name || c.author?.email || "Удалённый пользователь"} ·{" "}
                      {dateTime.format(new Date(c.created_at))}
                    </span>
                    {isAdmin || (me && c.author?.id === me.id) ? (
                      <button
                        type="button"
                        aria-label="Удалить комментарий"
                        title="Удалить комментарий"
                        onClick={() => void removeComment(c.id)}
                        className="-m-1 flex cursor-pointer rounded-[6px] border-0 bg-transparent p-1 text-muted opacity-60 transition hover:bg-[#fde8e6] hover:text-[#c0392b] hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-navy-950">{c.body}</p>
                </li>
              ))}
              {!lead.comments.length ? <li className="text-sm text-muted">Комментариев пока нет.</li> : null}
            </ul>
            <Textarea
              rows={3}
              placeholder="Комментарий видят только сотрудники"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button
              className="self-start"
              loading={saving}
              disabled={!comment.trim()}
              onClick={() => void addComment()}
            >
              Добавить комментарий
            </Button>
          </Card>
          <Card title="Согласие на обработку ПД">
            {lead.consent_at ? (
              <p className="m-0 text-sm leading-normal text-navy-950">
                Получено {dateTime.format(new Date(lead.consent_at))}
                <span className="mt-1 block text-xs text-muted">{lead.consent_document}</span>
              </p>
            ) : (
              <p className="m-0 text-sm text-muted">Заявка получена до введения отдельного согласия.</p>
            )}
            <p className="m-0 text-xs leading-normal text-muted">
              Заявка удаляется автоматически через 3 года. Если клиент отзовёт согласие, удалите заявку вручную в
              течение 30 дней.
            </p>
          </Card>
          <Card title="Технические данные">
            <dl className="m-0 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-xs text-muted">
              <dt>IP</dt>
              <dd className="m-0">{lead.ip || "—"}</dd>
              <dt>Браузер</dt>
              <dd className="m-0 break-all">{lead.user_agent || "—"}</dd>
            </dl>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить заявку?"
        text="Заявка, комментарии и приложенные файлы будут удалены без возможности восстановления."
        onConfirm={() => void remove()}
      />
    </>
  );
}
