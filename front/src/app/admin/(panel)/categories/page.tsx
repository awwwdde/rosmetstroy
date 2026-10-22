"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
} from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { SLUG_RE, slugify } from "@/features/admin/slug";
import { toast } from "@/features/admin/toast-store";
import type { Category } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const schema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: z.string().regex(SLUG_RE, "Только латиница, цифры и дефисы"),
  label: z.string().max(100),
  sort_order: z.number().int(),
});
type Values = z.infer<typeof schema>;

function CategoryForm({ initial, onSaved }: { initial: Category | null; onSaved: () => void }) {
  const { register, handleSubmit, setValue, getValues, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { title: "", slug: "", label: "", sort_order: 10 },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = { ...values, kind: "project", locale: "ru" };
      if (initial) await api.put(`/admin/categories/${initial.id}`, payload);
      else await api.post("/admin/categories", payload);
      toast.success("Категория сохранена");
      onSaved();
    } catch (e) {
      toast.error(e);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Название (фильтр на странице проектов)" error={formState.errors.title?.message}>
        <Input
          {...register("title", {
            onBlur: () => {
              if (!getValues("slug")) setValue("slug", slugify(getValues("title")));
            },
          })}
        />
      </Field>
      <Field label="Метка на карточке" hint="Например: ЗДАНИЕ">
        <Input {...register("label")} />
      </Field>
      <Field label="Адрес (slug)" error={formState.errors.slug?.message}>
        <Input {...register("slug")} />
      </Field>
      <Field label="Порядок">
        <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
      </Field>
      <Button type="submit" loading={formState.isSubmitting} className="self-end">
        Сохранить
      </Button>
    </form>
  );
}

export default function CategoriesPage() {
  const { data, error, loading, reload } = useResource<Category[]>("/categories?locale=ru");
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Category | null>(null);

  const remove = async () => {
    if (!removing) return;
    try {
      await api.del(`/admin/categories/${removing.id}`);
      toast.success("Категория удалена");
      setRemoving(null);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Категории проектов"
        description="Фильтры на странице «Проекты»"
        actions={<Button onClick={() => setEditing(null)}>Добавить категорию</Button>}
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <EmptyState title="Категорий пока нет." /> : null}
      {data?.length ? (
        <div className="overflow-hidden rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]">
          {data.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-4 border-b border-mist px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-[180px] flex-1 font-medium text-navy-950">{c.title}</span>
              <span className="w-32 text-muted">{c.label}</span>
              <span className="w-32 text-muted">{c.slug}</span>
              <span className="w-10 text-muted">#{c.sort_order}</span>
              <Button variant="secondary" onClick={() => setEditing(c)}>
                Изменить
              </Button>
              <Button variant="ghost" className="text-danger" onClick={() => setRemoving(c)}>
                Удалить
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Категория" : "Новая категория"}
      >
        {editing !== undefined ? (
          <CategoryForm
            initial={editing}
            onSaved={() => {
              setEditing(undefined);
              reload();
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Удалить категорию?"
        text="Проекты этой категории останутся, но будут без категории."
        onConfirm={() => void remove()}
      />
    </>
  );
}
