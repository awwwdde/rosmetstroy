"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EditorHeader } from "@/components/admin/EditorHeader";
import { MediaField } from "@/components/admin/MediaPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SeoFields } from "@/components/admin/SeoFields";
import { Card, ConfirmDialog, ErrorState, Field, Input, Loading, Select, Textarea } from "@/components/admin/ui";
import { ApiError, api } from "@/features/admin/api";
import { SLUG_RE, slugify } from "@/features/admin/slug";
import { toast } from "@/features/admin/toast-store";
import type { ArticleAdmin, ArticleIn, Media } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const schema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок"),
  slug: z.string().regex(SLUG_RE, "Только латиница, цифры и дефисы"),
  excerpt: z.string().max(1000),
  body_html: z.string(),
  status: z.enum(["draft", "published"]),
  published_at: z.string(),
  seo_title: z.string().max(255),
  seo_description: z.string().max(500),
  cover: z.custom<Media | null>(),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  title: "",
  slug: "",
  excerpt: "",
  body_html: "",
  status: "draft",
  published_at: "",
  seo_title: "",
  seo_description: "",
  cover: null,
};

// datetime-local ↔ ISO
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toValues = (a: ArticleAdmin): Values => ({
  title: a.title,
  slug: a.slug,
  excerpt: a.excerpt,
  body_html: a.body_html,
  status: a.status,
  published_at: toLocalInput(a.published_at),
  seo_title: a.seo_title,
  seo_description: a.seo_description,
  cover: a.cover,
});

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const { data, error, loading, reload } = useResource<ArticleAdmin>(isNew ? null : `/admin/articles/${id}`);
  const [confirm, setConfirm] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const { register, control, handleSubmit, reset, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (data) reset(toValues(data));
  }, [data, reset]);

  const [title, slug, seoTitle, seoDescription] = useWatch({
    control,
    name: ["title", "slug", "seo_title", "seo_description"],
  });
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(title));
  }, [title, slugTouched, setValue]);

  if (!isNew && loading && !data) return <Loading />;
  if (!isNew && (error || !data)) return <ErrorState message={error ?? "Статья не найдена"} onRetry={reload} />;

  const onSubmit = handleSubmit(async ({ cover, published_at, ...values }) => {
    const payload: ArticleIn = {
      ...values,
      locale: "ru",
      cover_id: cover?.id ?? null,
      published_at: published_at ? new Date(published_at).toISOString() : null,
    };
    try {
      const saved = isNew
        ? await api.post<ArticleAdmin>("/admin/articles", payload)
        : await api.put<ArticleAdmin>(`/admin/articles/${id}`, payload);
      toast.success(saved.status === "published" ? "Статья опубликована" : "Черновик сохранён");
      if (isNew) router.replace(`/admin/articles/${saved.id}`);
      else reset(toValues(saved));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError("slug", { message: e.message });
      toast.error(e);
    }
  });

  const remove = async () => {
    try {
      await api.del(`/admin/articles/${id}`);
      toast.success("Статья удалена");
      router.replace("/admin/articles");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <EditorHeader
        title={isNew ? "Новая статья" : (data?.title ?? "")}
        backHref="/admin/articles"
        publicHref={!isNew && data?.status === "published" ? `/blog/${data.slug}` : null}
        saving={isSubmitting}
        onDelete={isNew ? undefined : () => setConfirm(true)}
      />
      <form id="entity-form" onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <Field label="Заголовок" error={errors.title?.message}>
              <Input {...register("title")} aria-invalid={!!errors.title} className="h-12 text-lg" />
            </Field>
            <Field label="Адрес" hint={`/blog/${slug || "…"}`} error={errors.slug?.message}>
              <Input {...register("slug", { onChange: () => setSlugTouched(true) })} aria-invalid={!!errors.slug} />
            </Field>
            <Field label="Анонс" hint="Показывается в списке статей и под заголовком">
              <Textarea rows={3} {...register("excerpt")} />
            </Field>
          </Card>
          <Card title="Текст статьи">
            <Controller
              control={control}
              name="body_html"
              render={({ field }) => (
                <RichTextEditor key={data?.updated_at ?? "new"} value={field.value} onChange={field.onChange} />
              )}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Публикация">
            <Field label="Статус">
              <Select {...register("status")}>
                <option value="draft">Черновик</option>
                <option value="published">Опубликована</option>
              </Select>
            </Field>
            <Field label="Дата публикации" hint="Пусто — текущий момент. Будущая дата — отложенная публикация.">
              <Input type="datetime-local" {...register("published_at")} />
            </Field>
          </Card>
          <Card title="Обложка">
            <Controller
              control={control}
              name="cover"
              render={({ field }) => <MediaField label="Изображение" media={field.value} onChange={field.onChange} />}
            />
          </Card>
          <Card title="SEO">
            <SeoFields
              title={seoTitle}
              description={seoDescription}
              onTitle={(v) => setValue("seo_title", v, { shouldDirty: true })}
              onDescription={(v) => setValue("seo_description", v, { shouldDirty: true })}
              fallbackTitle={title}
            />
          </Card>
        </div>
      </form>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить статью?"
        text="Статья будет удалена без возможности восстановления."
        onConfirm={() => void remove()}
      />
    </>
  );
}
