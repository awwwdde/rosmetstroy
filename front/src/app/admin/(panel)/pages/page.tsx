"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Badge, Button, ErrorState, Field, Input, Loading, Modal, PageHeader, surface } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { pagePath } from "@/features/admin/page-templates";
import { SLUG_RE, slugify } from "@/features/admin/slug";
import { toast } from "@/features/admin/toast-store";
import type { PageData, PageListItem } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";
import { cn } from "@/lib/utils";

const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

const schema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: z.string().regex(SLUG_RE, "Только латиница, цифры и дефисы"),
});
type Values = z.infer<typeof schema>;

function CreatePageForm({ onCreated }: { onCreated: (slug: string) => void }) {
  const [slugTouched, setSlugTouched] = useState(false);
  const { register, handleSubmit, setValue, control, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", slug: "" },
  });
  const slug = useWatch({ control, name: "slug" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const page = await api.post<PageData>("/admin/pages", { ...values, locale: "ru" });
      toast.success("Страница создана — заполните её и опубликуйте");
      onCreated(page.slug);
    } catch (e) {
      setError("slug", { message: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Название" error={formState.errors.title?.message}>
        <Input
          autoFocus
          placeholder="Например: Вакансии"
          {...register("title", {
            onChange: (e) => !slugTouched && setValue("slug", slugify(e.target.value)),
          })}
        />
      </Field>
      <Field label="Адрес" hint={`Страница откроется по адресу /${slug || "…"}`} error={formState.errors.slug?.message}>
        <Input {...register("slug", { onChange: () => setSlugTouched(true) })} />
      </Field>
      <p className="m-0 text-xs leading-normal text-muted">
        Новая страница создаётся скрытой: заполните текст и включите публикацию.
      </p>
      <Button type="submit" loading={formState.isSubmitting} className="self-end">
        Создать
      </Button>
    </form>
  );
}

function PageRow({ page }: { page: PageListItem }) {
  return (
    <Link
      href={`/admin/pages/${page.slug}`}
      className="flex flex-wrap items-center gap-3 border-b border-[#eef2f6] px-4 py-3.5 text-sm text-navy-950 no-underline transition-colors last:border-b-0 hover:bg-[#f7f9fc] hover:text-navy-950"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-[8px] bg-[#eef3f8] text-navy-800">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-[200px] flex-1 flex-col">
        <span className="font-medium">{page.title}</span>
        <span className="text-xs text-muted">{pagePath(page.template, page.slug)}</span>
      </span>
      <Badge className={page.is_published ? "bg-[#e3f6ec] text-[#16794a]" : "bg-[#eef2f6] text-muted"}>
        {page.is_published ? "Опубликована" : "Скрыта"}
      </Badge>
      <span className="w-32 text-right text-xs text-muted">{date.format(new Date(page.updated_at))}</span>
    </Link>
  );
}

export default function PagesList() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useResource<PageListItem[]>("/admin/pages?locale=ru");
  const system = data?.filter((p) => p.template !== "custom") ?? [];
  const custom = data?.filter((p) => p.template === "custom") ?? [];

  return (
    <>
      <PageHeader
        title="Страницы"
        description="Тексты, блоки и SEO разделов сайта, а также ваши собственные страницы"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Создать страницу
          </Button>
        }
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data ? (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[13px] font-medium text-muted">Свои страницы</h2>
            {custom.length ? (
              <div className={cn(surface, "overflow-hidden")}>
                {custom.map((page) => (
                  <PageRow key={page.id} page={page} />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#c9d4e0] bg-transparent px-4 py-6 font-[inherit] text-sm text-muted transition-colors hover:border-accent hover:bg-[#f2f7ff] hover:text-accent"
              >
                <Plus className="size-4" aria-hidden="true" />
                Создайте страницу — например, «Вакансии» или «Доставка и оплата»
              </button>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[13px] font-medium text-muted">Разделы сайта</h2>
            <div className={cn(surface, "overflow-hidden")}>
              {system.map((page) => (
                <PageRow key={page.id} page={page} />
              ))}
            </div>
          </section>
        </>
      ) : null}
      <Modal open={creating} onClose={() => setCreating(false)} title="Новая страница">
        {creating ? <CreatePageForm onCreated={(slug) => router.push(`/admin/pages/${slug}`)} /> : null}
      </Modal>
    </>
  );
}
