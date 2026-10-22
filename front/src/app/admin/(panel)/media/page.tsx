"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { MediaThumb, UploadButton } from "@/components/admin/MediaPicker";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Pagination,
  Select,
} from "@/components/admin/ui";
import { api, qs } from "@/features/admin/api";
import { toast } from "@/features/admin/toast-store";
import type { Media, Paginated } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { formatBytes } from "@/lib/utils";

export default function MediaLibraryPage() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useResource<Paginated<Media>>(
    `/admin/media${qs({ page, page_size: 36, kind, q })}`,
  );
  const [selected, setSelected] = useState<Media | null>(null);
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const open = (m: Media) => {
    setSelected(m);
    setAlt(m.alt);
  };

  const saveAlt = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.patch<Media>(`/admin/media/${selected.id}`, { alt });
      setSelected(updated);
      toast.success("Описание сохранено");
      reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      await api.del(`/admin/media/${selected.id}`);
      toast.success("Файл удалён");
      setRemoving(false);
      setSelected(null);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Медиатека"
        description="Изображения (JPEG, PNG, WebP, GIF) и PDF-документы до 15 МБ"
        actions={
          <UploadButton
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onUploaded={() => reload()}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Поиск"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPage(1))}
          className="max-w-xs"
        />
        <Select
          value={kind}
          onChange={(e) => (setKind(e.target.value), setPage(1))}
          className="max-w-[180px]"
          aria-label="Тип"
        >
          <option value="">Все файлы</option>
          <option value="image">Изображения</option>
          <option value="document">Документы</option>
        </Select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.items.length ? <EmptyState title="Файлов пока нет." /> : null}
      {data?.items.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {data.items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => open(m)}
              className="flex cursor-pointer flex-col gap-1.5 rounded-[4px] border border-line bg-white p-1.5 text-left hover:border-accent"
            >
              <MediaThumb media={m} className="aspect-[4/3] w-full" />
              <span className="truncate text-xs text-navy-950">{m.original_name}</span>
              <span className="text-[11px] text-muted">
                {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                {formatBytes(m.size)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {data ? <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.original_name ?? ""} wide>
        {selected ? (
          <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
            <MediaThumb media={selected} className="aspect-[4/3] w-full bg-paper" />
            <div className="flex flex-col gap-3 text-sm">
              <Field label="Описание (alt)" hint="Важно для доступности и SEO: что изображено на фото">
                <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
              </Field>
              <Button loading={saving} onClick={() => void saveAlt()} className="self-start">
                Сохранить описание
              </Button>
              <div className="flex items-center gap-2 rounded-[4px] bg-paper p-2 text-xs break-all text-muted">
                {selected.url}
                <button
                  type="button"
                  aria-label="Скопировать адрес"
                  onClick={() =>
                    void navigator.clipboard.writeText(selected.url).then(() => toast.success("Адрес скопирован"))
                  }
                  className="cursor-pointer border-0 bg-transparent p-1 text-navy-950"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <span className="text-xs text-muted">
                {selected.mime_type} · {formatBytes(selected.size)}
              </span>
              <Button variant="danger" className="mt-auto self-start" onClick={() => setRemoving(true)}>
                Удалить файл
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        title="Удалить файл?"
        text="Если файл используется на страницах, там появится заглушка. Действие необратимо."
        onConfirm={() => void remove()}
      />
    </>
  );
}
