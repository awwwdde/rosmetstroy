"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Media } from "@/features/admin/types";

import { MediaPicker, MediaThumb, UploadButton } from "./MediaPicker";
import { Button, Input } from "./ui";

export type GalleryItem = { media: Media; caption: string };

/** Фотогалерея проекта: загрузка, выбор из медиатеки, подписи и порядок. */
export function GalleryField({ value, onChange }: { value: GalleryItem[]; onChange: (items: GalleryItem[]) => void }) {
  const [open, setOpen] = useState(false);
  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <UploadButton
          label="Загрузить фото"
          onUploaded={(items) => onChange([...value, ...items.map((media) => ({ media, caption: "" }))])}
        />
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Из медиатеки
        </Button>
      </div>
      <p className="m-0 text-xs text-muted">
        Порядок на странице проекта: 1–2 — пара фото после описания, 3 — панорама, далее — сетка.
      </p>
      {value.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 p-0">
          {value.map((item, index) => (
            <li
              key={`${item.media.id}-${index}`}
              className="flex flex-col gap-2 rounded-[4px] border border-line bg-white p-2"
            >
              <div className="relative">
                <MediaThumb media={item.media} className="aspect-[4/3] w-full" />
                <span className="absolute top-1.5 left-1.5 rounded-[3px] bg-navy-950/80 px-1.5 text-xs text-white">
                  {index + 1}
                </span>
              </div>
              <Input
                placeholder="Подпись"
                value={item.caption}
                onChange={(e) =>
                  onChange(value.map((it, i) => (i === index ? { ...it, caption: e.target.value } : it)))
                }
                className="h-8 text-sm"
              />
              <div className="flex justify-between">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    className="h-8 px-2"
                    aria-label="Левее"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-8 px-2"
                    aria-label="Правее"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-danger"
                  aria-label="Убрать из галереи"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-[4px] border border-dashed border-line p-6 text-center text-sm text-muted">
          Фотографий пока нет
        </p>
      )}
      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(media) => onChange([...value, { media, caption: "" }])}
      />
    </div>
  );
}
