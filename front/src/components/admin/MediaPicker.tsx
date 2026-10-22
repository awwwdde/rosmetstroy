"use client";

/* eslint-disable @next/next/no-img-element -- превью в админке без оптимизации */

import { FileText, ImageIcon, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { api, qs } from "@/features/admin/api";
import { toast } from "@/features/admin/toast-store";
import type { Media, Paginated } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { cn } from "@/lib/utils";

import { Button, Input, Loading, Modal, Pagination } from "./ui";

export async function uploadMedia(file: File, alt = ""): Promise<Media> {
  const form = new FormData();
  form.append("file", file, file.name);
  return api.post<Media>(`/admin/media${qs({ alt })}`, form);
}

export function UploadButton({
  onUploaded,
  accept = "image/*",
  multiple = true,
  label = "Загрузить",
}: {
  onUploaded: (media: Media[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const done: Media[] = [];
    for (const file of Array.from(files)) {
      try {
        done.push(await uploadMedia(file));
      } catch (e) {
        toast.error(new Error(`${file.name}: ${e instanceof Error ? e.message : "ошибка загрузки"}`));
      }
    }
    setBusy(false);
    if (done.length) {
      toast.success(`Загружено файлов: ${done.length}`);
      onUploaded(done);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" aria-hidden="true" />
        {label}
      </Button>
    </>
  );
}

export function MediaThumb({
  media,
  className,
}: {
  media: Pick<Media, "url" | "alt" | "kind" | "original_name"> | null;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-[4px] bg-mist", className)}>
      {media ? (
        media.kind === "image" ? (
          <img src={media.url} alt={media.alt} className="size-full object-cover" loading="lazy" />
        ) : (
          <FileText className="size-8 text-muted" aria-label={media.original_name} />
        )
      ) : (
        <ImageIcon className="size-6 text-placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

type PickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
  kind?: "image" | "document";
};

export function MediaPicker({ open, onClose, onSelect, kind = "image" }: PickerProps) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, loading, reload } = useResource<Paginated<Media>>(
    open ? `/admin/media${qs({ page, page_size: 24, kind, q })}` : null,
  );

  return (
    <Modal open={open} onClose={onClose} title="Медиатека" wide>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Поиск по имени или описанию"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <UploadButton
            accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "application/pdf"}
            onUploaded={(items) => {
              reload();
              if (items.length === 1) {
                onSelect(items[0]);
                onClose();
              }
            }}
          />
        </div>
        {loading && !data ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {data?.items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m);
                  onClose();
                }}
                className="group flex cursor-pointer flex-col gap-1.5 rounded-[4px] border border-line bg-white p-1.5 text-left hover:border-accent"
              >
                <MediaThumb media={m} className="aspect-[4/3] w-full" />
                <span className="truncate text-xs text-muted group-hover:text-navy-950">{m.original_name}</span>
              </button>
            ))}
            {data && !data.items.length ? (
              <p className="col-span-full m-0 py-8 text-sm text-muted">Файлов пока нет — загрузите первый.</p>
            ) : null}
          </div>
        )}
        {data ? <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}
      </div>
    </Modal>
  );
}

/** Поле изображения, хранящее ссылку на запись медиатеки (id). */
export function MediaField({
  label,
  media,
  onChange,
}: {
  label: string;
  media: Media | null;
  onChange: (media: Media | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-navy-950">{label}</span>
      <div className="flex items-center gap-3">
        <MediaThumb media={media} className="h-20 w-28 flex-none" />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}>
              {media ? "Заменить" : "Выбрать"}
            </Button>
            {media ? (
              <Button variant="ghost" onClick={() => onChange(null)}>
                Убрать
              </Button>
            ) : null}
          </div>
          {media ? <span className="max-w-[260px] truncate text-xs text-muted">{media.original_name}</span> : null}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={onChange} />
    </div>
  );
}

/** Поле изображения или документа в секциях страниц и настройках: хранит URL файла. */
export function ImageUrlField({
  label,
  value,
  onChange,
  kind = "image",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind?: "image" | "document";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-navy-950">{label}</span>
      <div className="flex items-center gap-3">
        <MediaThumb
          media={value ? { url: value, alt: "", kind, original_name: value } : null}
          className="h-20 w-28 flex-none"
        />
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}>
              {value ? "Заменить" : "Выбрать"}
            </Button>
            {value ? (
              <Button variant="ghost" onClick={() => onChange("")}>
                Убрать
              </Button>
            ) : null}
          </div>
          {value ? (
            <span className="max-w-[260px] truncate text-xs text-muted">{value}</span>
          ) : (
            <span className="text-xs text-muted">Пока не выбрано — на сайте показывается заглушка</span>
          )}
        </div>
      </div>
      <MediaPicker open={open} kind={kind} onClose={() => setOpen(false)} onSelect={(m) => onChange(m.url)} />
    </div>
  );
}
