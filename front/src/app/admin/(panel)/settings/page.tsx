"use client";

import { useState } from "react";

import { type FieldDef, SchemaFields } from "@/components/admin/SchemaFields";
import { Button, Card, ErrorState, Loading, PageHeader } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { toast } from "@/features/admin/toast-store";
import type { Setting } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const link: FieldDef[] = [
  { key: "label", label: "Текст", type: "text" },
  { key: "href", label: "Ссылка", type: "url" },
];

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Компания и контакты",
    fields: [
      { key: "company_name", label: "Название (в шапке)", type: "text" },
      { key: "legal_name", label: "Юридическое название", type: "text" },
      { key: "logo_url", label: "Логотип (пусто — фирменный знак из дизайна)", type: "image" },
      { key: "phone", label: "Телефон (как показывать)", type: "text" },
      { key: "phone_href", label: "Телефон для ссылки (+7…)", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "address", label: "Адрес", type: "text" },
      { key: "work_hours", label: "Режим работы (пусто — не показывается)", type: "text" },
    ],
  },
  {
    title: "Подтверждённые сведения",
    fields: [
      {
        key: "highlights",
        label: "Показатели (только подтверждённые; пустой список — блок скрыт)",
        type: "list",
        itemTitle: "label",
        max: 6,
        fields: [
          { key: "value", label: "Значение", type: "text" },
          { key: "label", label: "Подпись", type: "text" },
        ],
      },
      {
        key: "requisites",
        label: "Реквизиты (строки с пустым значением не показываются)",
        type: "list",
        itemTitle: "k",
        fields: [
          { key: "k", label: "Название", type: "text" },
          { key: "v", label: "Значение", type: "text" },
        ],
      },
    ],
  },
  {
    title: "Навигация",
    fields: [
      {
        key: "nav",
        label: "Пункты главного меню",
        type: "list",
        itemTitle: "label",
        fields: [...link, { key: "key", label: "Ключ раздела (services — выпадающее меню услуг)", type: "text" }],
      },
      {
        key: "menu_groups",
        label: "Группы меню «Услуги»",
        type: "list",
        itemTitle: "title",
        fields: [
          { key: "title", label: "Название группы (совпадает с полем «Группа» услуги)", type: "text" },
          { key: "note", label: "Пояснение", type: "textarea" },
        ],
      },
      { key: "header_cta_label", label: "Кнопка в шапке", type: "text" },
      { key: "mobile_cta_label", label: "Кнопка в мобильном меню", type: "text" },
    ],
  },
  {
    title: "Подвал",
    fields: [
      { key: "footer_text", label: "Описание компании", type: "textarea" },
      { key: "footer_note", label: "Примечание внизу", type: "text" },
      { key: "footer_company", label: "Колонка «Компания»", type: "list", itemTitle: "label", fields: link },
      {
        key: "documents",
        label: "Документы",
        type: "list",
        itemTitle: "label",
        fields: [
          { key: "label", label: "Название", type: "text" },
          { key: "href", label: "Файл (PDF) или ссылка", type: "document" },
        ],
      },
      { key: "socials", label: "Социальные сети", type: "list", itemTitle: "label", fields: link },
    ],
  },
  {
    title: "SEO по умолчанию",
    fields: [
      {
        key: "seo",
        label: "Метаданные",
        type: "group",
        fields: [
          { key: "default_title", label: "Заголовок главной", type: "text" },
          { key: "title_template", label: "Шаблон заголовка (%s — название страницы)", type: "text" },
          {
            key: "default_description",
            label: "Описание компании по умолчанию (поисковики, соцсети и llms.txt для нейросетей)",
            type: "textarea",
          },
          { key: "og_image_url", label: "Изображение для соцсетей", type: "image" },
          {
            key: "area_served",
            label: "География работ — например, «Москва и Московская область» (пусто — не указывается)",
            type: "text",
          },
        ],
      },
    ],
  },
  {
    title: "Поисковые системы",
    fields: [
      {
        key: "seo",
        label: "Коды подтверждения прав на сайт (только значение content из мета-тега)",
        type: "group",
        fields: [
          { key: "yandex_verification", label: "Яндекс Вебмастер (yandex-verification)", type: "text" },
          { key: "google_verification", label: "Google Search Console (google-site-verification)", type: "text" },
          { key: "bing_verification", label: "Bing Webmaster (msvalidate.01)", type: "text" },
        ],
      },
    ],
  },
];

export default function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, error, loading, reload } = useResource<Setting>("/admin/settings/site?locale=ru");
  const [value, setValue] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  const [source, setSource] = useState<Setting | null>(null);
  if (data && data !== source) {
    setSource(data);
    setValue(structuredClone(data.value));
  }

  if (!isAdmin) return authLoading ? <Loading /> : <ErrorState message="Раздел доступен только администраторам." />;
  if (loading && !value) return <Loading />;
  if (error || !value) return <ErrorState message={error ?? "Настройки не найдены"} onRetry={reload} />;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.put<Setting>("/admin/settings/site?locale=ru", { value });
      setValue(structuredClone(saved.value));
      toast.success("Настройки сохранены");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Настройки сайта"
        description="Контакты, логотип, навигация, подвал, документы и SEO"
        actions={
          <Button loading={saving} onClick={() => void save()}>
            Сохранить
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {GROUPS.map((group) => (
          <Card key={group.title} title={group.title}>
            <SchemaFields fields={group.fields} value={value} onChange={setValue} />
          </Card>
        ))}
      </div>
    </>
  );
}
