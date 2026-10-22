"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EditorHeader } from "@/components/admin/EditorHeader";
import { GalleryField, type GalleryItem } from "@/components/admin/GalleryField";
import { MediaField } from "@/components/admin/MediaPicker";
import { Repeater } from "@/components/admin/SchemaFields";
import { SeoFields } from "@/components/admin/SeoFields";
import {
  Card,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  Loading,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { ApiError, api, qs } from "@/features/admin/api";
import { SLUG_RE, slugify } from "@/features/admin/slug";
import { toast } from "@/features/admin/toast-store";
import type { Category, Media, Paginated, ProjectAdmin, ProjectIn, ServiceCard } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const schema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: z.string().regex(SLUG_RE, "Только латиница, цифры и дефисы"),
  type_label: z.string(),
  location: z.string().max(255),
  company_role: z.string().max(3000),
  works_summary: z.string().max(500),
  intro: z.string(),
  features: z.string(),
  solution: z.string(),
  result: z.string(),
  params: z.array(z.object({ k: z.string().min(1), v: z.string().min(1) })).max(12),
  works: z.array(z.object({ title: z.string().min(1), description: z.string() })),
  layout_size: z.enum(["big", "wide", "tall", "s"]),
  is_featured: z.boolean(),
  is_published: z.boolean(),
  sort_order: z.number().int(),
  seo_title: z.string().max(255),
  seo_description: z.string().max(500),
  category_id: z.number().nullable(),
  cover: z.custom<Media | null>(),
  gallery: z.custom<GalleryItem[]>(),
  service_ids: z.array(z.number()),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  title: "",
  slug: "",
  type_label: "",
  location: "",
  company_role: "",
  works_summary: "",
  intro: "",
  features: "",
  solution: "",
  result: "",
  params: [],
  works: [],
  layout_size: "s",
  is_featured: false,
  is_published: false,
  sort_order: 100,
  seo_title: "",
  seo_description: "",
  category_id: null,
  cover: null,
  gallery: [],
  service_ids: [],
};

const toValues = (p: ProjectAdmin): Values => ({
  ...EMPTY,
  ...p,
  layout_size: p.layout_size as Values["layout_size"],
  cover: p.cover,
  gallery: p.images.map((i) => ({ media: i.media, caption: i.caption })),
  service_ids: p.services.map((s) => s.id),
});

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const { data, error, loading, reload } = useResource<ProjectAdmin>(isNew ? null : `/admin/projects/${id}`);
  const categories = useResource<Category[]>("/categories?locale=ru");
  const services = useResource<Paginated<ServiceCard>>(`/admin/services${qs({ page_size: 100, locale: "ru" })}`);
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
  if (!isNew && (error || !data)) return <ErrorState message={error ?? "Проект не найден"} onRetry={reload} />;

  const onSubmit = handleSubmit(async ({ cover, gallery, ...values }) => {
    const payload: ProjectIn = {
      ...values,
      locale: "ru",
      cover_id: cover?.id ?? null,
      images: gallery.map((g) => ({ media_id: g.media.id, caption: g.caption })),
    };
    try {
      const saved = isNew
        ? await api.post<ProjectAdmin>("/admin/projects", payload)
        : await api.put<ProjectAdmin>(`/admin/projects/${id}`, payload);
      toast.success("Проект сохранён");
      if (isNew) router.replace(`/admin/projects/${saved.id}`);
      else reset(toValues(saved));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError("slug", { message: e.message });
      toast.error(e);
    }
  });

  const remove = async () => {
    try {
      await api.del(`/admin/projects/${id}`);
      toast.success("Проект удалён");
      router.replace("/admin/projects");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <EditorHeader
        title={isNew ? "Новый проект" : (data?.title ?? "")}
        backHref="/admin/projects"
        publicHref={!isNew && data?.is_published ? `/projects/${data.slug}` : null}
        saving={isSubmitting}
        onDelete={isNew ? undefined : () => setConfirm(true)}
      />
      <form id="entity-form" onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card title="Основное">
            <Field label="Название" error={errors.title?.message}>
              <Input {...register("title")} aria-invalid={!!errors.title} />
            </Field>
            <Field label="Адрес страницы" hint={`/projects/${slug || "…"}`} error={errors.slug?.message}>
              <Input {...register("slug", { onChange: () => setSlugTouched(true) })} aria-invalid={!!errors.slug} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Тип объекта">
                <Input {...register("type_label")} placeholder="Производственный корпус" />
              </Field>
              <Field label="Местоположение">
                <Input {...register("location")} placeholder="Город, регион" />
              </Field>
            </div>
            <Field label="Выполненные работы (кратко, для карточки)">
              <Input {...register("works_summary")} placeholder="КМД, изготовление и монтаж" />
            </Field>
          </Card>
          <Card title="Описание кейса">
            <p className="m-0 text-xs text-muted">
              Публикуйте только реальные объекты и подтверждённые сведения; выдуманные кейсы и цифры недопустимы.
            </p>
            <Field label="Задача заказчика">
              <Textarea rows={4} {...register("intro")} />
            </Field>
            <Field
              label="Роль «Росметстрой»"
              hint="Какие работы выполнила компания, какие — подрядчики или другие участники"
            >
              <Textarea rows={3} {...register("company_role")} />
            </Field>
            <Field label="Особенности проекта">
              <Textarea {...register("features")} />
            </Field>
            <Field label="Организация работ">
              <Textarea {...register("solution")} />
            </Field>
            <Field label="Результат">
              <Textarea {...register("result")} />
            </Field>
          </Card>
          <Card title="Характеристики">
            <Controller
              control={control}
              name="params"
              render={({ field }) => (
                <Repeater
                  label="Подтверждённые характеристики"
                  itemTitle="k"
                  fields={[
                    { key: "k", label: "Параметр", type: "text" },
                    { key: "v", label: "Значение", type: "text" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
            <Controller
              control={control}
              name="works"
              render={({ field }) => (
                <Repeater
                  label="Выполненные работы (по этапам)"
                  itemTitle="title"
                  fields={[
                    { key: "title", label: "Этап", type: "text" },
                    { key: "description", label: "Описание", type: "text" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Фотогалерея">
            <Controller
              control={control}
              name="gallery"
              render={({ field }) => <GalleryField value={field.value} onChange={field.onChange} />}
            />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Публикация">
            <Controller
              control={control}
              name="is_published"
              render={({ field }) => <Toggle label="Опубликован" checked={field.value} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <Toggle label="Показывать на главной" checked={field.value} onChange={field.onChange} />
              )}
            />
            <Field label="Порядок" hint="Меньше — выше">
              <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
            </Field>
            <Field label="Размер плитки в галерее">
              <Select {...register("layout_size")}>
                <option value="s">Обычная (4 колонки)</option>
                <option value="wide">Широкая (8 колонок)</option>
                <option value="tall">Высокая (4 колонки, 2 ряда)</option>
                <option value="big">Большая (8 колонок, 2 ряда)</option>
              </Select>
            </Field>
          </Card>
          <Card title="Категория и услуги">
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Field label="Категория">
                  <Select
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Без категории</option>
                    {categories.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={control}
              name="service_ids"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-medium text-navy-950">Связанные услуги</span>
                  {services.data?.items.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.value.includes(s.id)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked ? [...field.value, s.id] : field.value.filter((v) => v !== s.id),
                          )
                        }
                      />
                      {s.title}
                    </label>
                  ))}
                </div>
              )}
            />
          </Card>
          <Card title="Обложка">
            <Controller
              control={control}
              name="cover"
              render={({ field }) => <MediaField label="Главное фото" media={field.value} onChange={field.onChange} />}
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
        title="Удалить проект?"
        text="Проект и его галерея будут удалены с сайта."
        onConfirm={() => void remove()}
      />
    </>
  );
}
