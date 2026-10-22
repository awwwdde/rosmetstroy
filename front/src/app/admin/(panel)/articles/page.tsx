"use client";

import { useState } from "react";

import { EntityList } from "@/components/admin/EntityList";
import { Badge, Select } from "@/components/admin/ui";
import type { ArticleCard } from "@/features/admin/types";

const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

export default function ArticlesList() {
  const [status, setStatus] = useState("");
  return (
    <EntityList<ArticleCard>
      title="Блог"
      description="Статьи: визуальный редактор, обложки, SEO и публикация"
      endpoint="/admin/articles"
      basePath="/admin/articles"
      createLabel="Новая статья"
      extraQuery={{ status }}
      filters={
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-[200px]"
          aria-label="Статус"
        >
          <option value="">Все статьи</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </Select>
      }
      meta={(a) => (
        <>
          <span className="w-36 text-muted">{a.published_at ? date.format(new Date(a.published_at)) : "—"}</span>
          <Badge className={a.status === "published" ? "bg-[#dff5e3] text-[#1d6b34]" : "bg-mist text-muted"}>
            {a.status === "published" ? "Опубликована" : "Черновик"}
          </Badge>
        </>
      )}
    />
  );
}
