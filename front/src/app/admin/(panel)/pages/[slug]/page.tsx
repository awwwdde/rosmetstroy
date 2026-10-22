"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUrlField } from "@/components/admin/MediaPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PageBlocks } from "@/components/admin/SchemaFields";
import { SeoFields } from "@/components/admin/SeoFields";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  Loading,
  PageHeader,
  Toggle,
} from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { PAGE_TEMPLATES, pagePath } from "@/features/admin/page-templates";
import { toast } from "@/features/admin/toast-store";
import type { PageData } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

export default function PageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useResource<PageData>(`/admin/pages/${slug}?locale=ru`);
  const [draft, setDraft] = useState<PageData | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);

  // Черновик пересоздаётся при получении новых данных с сервера
  const [source, setSource] = useState<PageData | null>(null);
  if (data && data !== source) {
    setSource(data);
    setDraft(structuredClone(data));
  }

  if (loading && !draft) return <Loading />;
  if (error || !draft) return <ErrorState message={error ?? "Страница не найдена"} onRetry={reload} />;

  const template = PAGE_TEMPLATES[draft.template];
  const isCustom = draft.template === "custom";
  const path = pagePath(draft.template, draft.slug);
  const dirty = JSON.stringify(draft) !== JSON.stringify(source);
  const set = <K extends keyof PageData>(key: K, value: PageData[K]) => setDraft({ ...draft, [key]: value });

  const save = async () => {
    if (!draft.title.trim()) return toast.error(new Error("Укажите название страницы"));
    setSaving(true);
    try {
      const saved = await api.put<PageData>(`/admin/pages/${slug}?locale=ru`, {
        title: draft.title,
        seo_title: draft.seo_title,
        seo_description: draft.seo_description,
        og_image_url: draft.og_image_url,
        is_published: draft.is_published,
        sections: draft.sections,
        body_html: draft.body_html,
      });
      setSource(saved);
      setDraft(structuredClone(saved));
      toast.success("Страница сохранена");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/admin/pages/${slug}?locale=ru`);
      toast.success("Страница удалена");
      router.replace("/admin/pages");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title={draft.title}
        description={isCustom ? `Своя страница · ${path}` : `Раздел сайта · ${path}`}
        actions={
          <>
            {dirty ? <Badge className="bg-[#fff3d9] text-[#8a5a00]">Есть несохранённые изменения</Badge> : null}
            <Link href="/admin/pages" className="inline-flex h-10 items-center px-2 text-sm no-underline">
              ← К списку
            </Link>
            {draft.template !== "not-found" && draft.is_published ? (
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 px-2 text-sm no-underline"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> На сайте
              </a>
            ) : null}
            {isCustom ? (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Удалить
              </Button>
            ) : null}
            <Button loading={saving} disabled={!dirty} onClick={() => void save()}>
              Сохранить
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {template ? (
            <PageBlocks
              fields={template.fields}
              value={draft.sections}
              onChange={(sections) => set("sections", sections)}
            />
          ) : (
            <ErrorState message="Для этой страницы не задан шаблон редактирования." />
          )}
          {template?.hasBody ? (
            <Card title="Текст страницы">
              <RichTextEditor value={draft.body_html} onChange={(html) => set("body_html", html)} />
            </Card>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Публикация">
            <Field label="Название">
              <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Toggle
              label="Страница опубликована"
              checked={draft.is_published}
              onChange={(v) => set("is_published", v)}
            />
            {isCustom ? (
              <p className="m-0 text-xs leading-normal text-muted">
                Чтобы страница появилась в меню или подвале, добавьте ссылку {path} в «Настройки сайта».
              </p>
            ) : null}
          </Card>
          <Card title="SEO">
            <SeoFields
              title={draft.seo_title}
              description={draft.seo_description}
              onTitle={(v) => set("seo_title", v)}
              onDescription={(v) => set("seo_description", v)}
              fallbackTitle={draft.title}
            />
            <ImageUrlField
              label="Изображение для соцсетей (Open Graph)"
              value={draft.og_image_url}
              onChange={(v) => set("og_image_url", v)}
            />
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить страницу?"
        text={`Страница ${path} перестанет открываться на сайте. Если на неё есть ссылки в меню, уберите их в настройках сайта.`}
        onConfirm={() => void remove()}
      />
    </>
  );
}
