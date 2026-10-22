"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EditorHeader } from "@/components/admin/EditorHeader";
import { MediaField } from "@/components/admin/MediaPicker";
import { type FieldDef, Repeater } from "@/components/admin/SchemaFields";
import { SeoFields } from "@/components/admin/SeoFields";
import { Card, ConfirmDialog, ErrorState, Field, Input, Loading, Textarea, Toggle } from "@/components/admin/ui";
import { ApiError, api, qs } from "@/features/admin/api";
import { SLUG_RE, slugify } from "@/features/admin/slug";
import { toast } from "@/features/admin/toast-store";
import type { Media, Paginated, ProjectCard, ServiceAdmin, ServiceIn } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const kvFields: FieldDef[] = [
  { key: "k", label: "Параметр", type: "text" },
  { key: "v", label: "Значение", type: "text" },
];

const kv = z.object({
  k: z.string().trim().min(1, "Заполните параметр"),
  v: z.string().trim().min(1, "Заполните значение"),
});
const schema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: z.string().regex(SLUG_RE, "Только латиница, цифры и дефисы"),
  menu_title: z.string(),
  menu_group: z.string(),
  subtitle: z.string().max(500),
  summary: z.string().max(3000),
  description: z.string().max(10000),
  tasks: z.array(z.object({ title: z.string().min(1), description: z.string() })),
  scope: z.array(z.object({ title: z.string().min(1), description: z.string() })),
  limitations: z.array(z.object({ title: z.string().min(1), description: z.string() })),
  execution_note: z.string().max(3000),
  hero_badges: z.array(kv).max(6),
  uses_title: z.string(),
  uses_text: z.string(),
  uses: z.array(z.object({ title: z.string().min(1), description: z.string(), href: z.string() })),
  specs: z.array(kv),
  stages: z.array(z.object({ title: z.string().min(1), description: z.string() })),
  cta_title: z.string(),
  cta_text: z.string(),
  is_partner: z.boolean(),
  show_in_menu: z.boolean(),
  is_published: z.boolean(),
  sort_order: z.number().int(),
  seo_title: z.string().max(255),
  seo_description: z.string().max(500),
  cover: z.custom<Media | null>(),
  tech_image: z.custom<Media | null>(),
  project_ids: z.array(z.number()),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  title: "",
  slug: "",
  menu_title: "",
  menu_group: "Металлоконструкции",
  subtitle: "",
  summary: "",
  description: "",
  tasks: [],
  scope: [],
  limitations: [],
  execution_note: "",
  hero_badges: [],
  uses_title: "Для каких объектов",
  uses_text: "",
  uses: [],
  specs: [],
  stages: [],
  cta_title: "",
  cta_text: "",
  is_partner: false,
  show_in_menu: true,
  is_published: false,
  sort_order: 100,
  seo_title: "",
  seo_description: "",
  cover: null,
  tech_image: null,
  project_ids: [],
};

function toValues(s: ServiceAdmin): Values {
  return {
    ...EMPTY,
    ...s,
    project_ids: s.projects.map((p) => p.id),
    cover: s.cover,
    tech_image: s.tech_image,
  };
}

export default function ServiceEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "new";
  const { data, error, loading, reload } = useResource<ServiceAdmin>(isNew ? null : `/admin/services/${id}`);
  const projects = useResource<Paginated<ProjectCard>>(`/admin/projects${qs({ page_size: 100, locale: "ru" })}`);
  const [confirm, setConfirm] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { register, control, handleSubmit, reset, setValue, setError, formState } = form;
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
  if (!isNew && (error || !data)) return <ErrorState message={error ?? "Услуга не найдена"} onRetry={reload} />;

  const onSubmit = handleSubmit(async ({ cover, tech_image, ...values }) => {
    const payload: ServiceIn = {
      ...values,
      locale: "ru",
      cover_id: cover?.id ?? null,
      tech_image_id: tech_image?.id ?? null,
    };
    try {
      const saved = isNew
        ? await api.post<ServiceAdmin>("/admin/services", payload)
        : await api.put<ServiceAdmin>(`/admin/services/${id}`, payload);
      toast.success("Услуга сохранена");
      if (isNew) router.replace(`/admin/services/${saved.id}`);
      else reset(toValues(saved));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError("slug", { message: e.message });
      toast.error(e);
    }
  });

  const remove = async () => {
    try {
      await api.del(`/admin/services/${id}`);
      toast.success("Услуга удалена");
      router.replace("/admin/services");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <EditorHeader
        title={isNew ? "Новая услуга" : (data?.title ?? "")}
        backHref="/admin/services"
        publicHref={!isNew && data?.is_published ? `/services/${data.slug}` : null}
        saving={isSubmitting}
        onDelete={isNew ? undefined : () => setConfirm(true)}
      />
      <form id="entity-form" onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card title="Основное">
            <Field label="Название" error={errors.title?.message}>
              <Input {...register("title")} aria-invalid={!!errors.title} />
            </Field>
            <Field label="Адрес страницы" hint={`/services/${slug || "…"}`} error={errors.slug?.message}>
              <Input {...register("slug", { onChange: () => setSlugTouched(true) })} aria-invalid={!!errors.slug} />
            </Field>
            <Field label="Краткое описание (карточки, меню)">
              <Input {...register("subtitle")} />
            </Field>
            <Field label="Описание на первом экране">
              <Textarea rows={4} {...register("summary")} />
            </Field>
            <Controller
              control={control}
              name="hero_badges"
              render={({ field }) => (
                <Repeater
                  label="Плашки на фото (до 3)"
                  fields={kvFields}
                  itemTitle="k"
                  max={6}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Описание и задачи">
            <Field label="Полное описание" hint="Абзацы разделяйте пустой строкой">
              <Textarea rows={6} {...register("description")} />
            </Field>
            <Controller
              control={control}
              name="tasks"
              render={({ field }) => (
                <Repeater
                  label="Какие задачи решает"
                  itemTitle="title"
                  fields={[
                    { key: "title", label: "Заголовок", type: "text" },
                    { key: "description", label: "Описание", type: "textarea" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Для каких объектов">
            <Field label="Заголовок блока">
              <Input {...register("uses_title")} />
            </Field>
            <Field label="Подводка">
              <Textarea {...register("uses_text")} />
            </Field>
            <Controller
              control={control}
              name="uses"
              render={({ field }) => (
                <Repeater
                  label="Объекты"
                  itemTitle="title"
                  fields={[
                    { key: "title", label: "Название", type: "text" },
                    { key: "description", label: "Описание", type: "text" },
                    { key: "href", label: "Ссылка (необязательно)", type: "url" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Состав работ и организация выполнения">
            <Controller
              control={control}
              name="scope"
              render={({ field }) => (
                <Repeater
                  label="Состав работ"
                  itemTitle="title"
                  fields={[
                    { key: "title", label: "Заголовок", type: "text" },
                    { key: "description", label: "Описание", type: "textarea" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
            <Field
              label="Как организуется выполнение"
              hint="Кто выполняет работы: собственные специалисты, подрядчики, партнёр. Только подтверждённые сведения."
            >
              <Textarea rows={4} {...register("execution_note")} />
            </Field>
          </Card>
          <Card title="Особенности и ограничения">
            <Controller
              control={control}
              name="limitations"
              render={({ field }) => (
                <Repeater
                  label="Ограничения и условия"
                  itemTitle="title"
                  fields={[
                    { key: "title", label: "Заголовок", type: "text" },
                    { key: "description", label: "Описание", type: "textarea" },
                  ]}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Технические характеристики (необязательно)">
            <Controller
              control={control}
              name="tech_image"
              render={({ field }) => (
                <MediaField label="Фото узла / детали" media={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="specs"
              render={({ field }) => (
                <Repeater
                  label="Параметры"
                  itemTitle="k"
                  fields={kvFields}
                  value={field.value}
                  onChange={field.onChange as never}
                />
              )}
            />
          </Card>
          <Card title="Этапы работ">
            <Controller
              control={control}
              name="stages"
              render={({ field }) => (
                <Repeater
                  label="Этапы"
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
          <Card title="Призыв к расчёту">
            <Field label="Заголовок">
              <Input {...register("cta_title")} />
            </Field>
            <Field label="Текст">
              <Textarea {...register("cta_text")} />
            </Field>
          </Card>
          <Card title="Связанные проекты">
            {projects.data ? (
              <Controller
                control={control}
                name="project_ids"
                render={({ field }) => (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {projects.data!.items.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value.includes(p.id)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked ? [...field.value, p.id] : field.value.filter((v) => v !== p.id),
                            )
                          }
                        />
                        {p.title}
                      </label>
                    ))}
                  </div>
                )}
              />
            ) : (
              <Loading />
            )}
            <p className="m-0 text-xs text-muted">
              Вопросы и ответы для этой услуги редактируются в разделе «Вопросы и ответы».
            </p>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Публикация">
            <Controller
              control={control}
              name="is_published"
              render={({ field }) => <Toggle label="Опубликована" checked={field.value} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="show_in_menu"
              render={({ field }) => (
                <Toggle label="Показывать в меню" checked={field.value} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="is_partner"
              render={({ field }) => <Toggle label="Услуга партнёра" checked={field.value} onChange={field.onChange} />}
            />
            <Field label="Порядок" hint="Меньше — выше в списках">
              <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
            </Field>
          </Card>
          <Card title="Меню">
            <Field label="Название в меню" hint="Пусто — используется название">
              <Input {...register("menu_title")} />
            </Field>
            <Field label="Категория (группа в меню)" hint="Совпадает с группами в «Настройки сайта»">
              <Input {...register("menu_group")} />
            </Field>
          </Card>
          <Card title="Изображение">
            <Controller
              control={control}
              name="cover"
              render={({ field }) => (
                <MediaField
                  label="Главное фото (карточка и первый экран)"
                  media={field.value}
                  onChange={field.onChange}
                />
              )}
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
        title="Удалить услугу?"
        text="Страница услуги перестанет быть доступна на сайте."
        onConfirm={() => void remove()}
      />
    </>
  );
}
