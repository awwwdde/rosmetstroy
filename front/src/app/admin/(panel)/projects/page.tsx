"use client";

import { useState } from "react";

import { EntityList } from "@/components/admin/EntityList";
import { Badge, Select } from "@/components/admin/ui";
import type { Category, ProjectCard } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

export default function ProjectsList() {
  const [category, setCategory] = useState("");
  const { data: categories } = useResource<Category[]>("/categories?locale=ru");
  return (
    <EntityList<ProjectCard>
      title="Проекты"
      description="Кейсы: описание работ, характеристики, фотогалереи"
      endpoint="/admin/projects"
      basePath="/admin/projects"
      createLabel="Добавить проект"
      extraQuery={{ category }}
      filters={
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="max-w-[220px]"
          aria-label="Категория"
        >
          <option value="">Все категории</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.title}
            </option>
          ))}
        </Select>
      }
      meta={(p) => (
        <>
          <span className="w-44 text-muted">{p.category?.title ?? "—"}</span>
          {p.is_featured ? <Badge className="bg-sky/40 text-navy-950">На главной</Badge> : null}
          <Badge className={p.is_published ? "bg-[#dff5e3] text-[#1d6b34]" : "bg-mist text-muted"}>
            {p.is_published ? "Опубликован" : "Черновик"}
          </Badge>
        </>
      )}
    />
  );
}
