import {
  BadgeCheck,
  Building2,
  Cookie,
  Handshake,
  type LucideIcon,
  Menu,
  PanelBottom,
  Search,
  Type,
} from "lucide-react";

import type { FieldDef } from "@/components/admin/SchemaFields";
import { DEFAULT_LABELS, LABEL_GROUPS, LABEL_NAMES } from "@/lib/labels";

const link: FieldDef[] = [
  { key: "label", label: "Текст", type: "text" },
  { key: "href", label: "Ссылка", type: "url" },
];

export type SettingsSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Коротко — в навигации */
  summary: string;
  /** Где на сайте видны эти настройки */
  where: string;
  preview: string;
  fields: FieldDef[];
};

/** Разделы «Настроек сайта». Порядок — от того, что меняют чаще, к редкому. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "company",
    title: "Компания и контакты",
    icon: Building2,
    summary: "Название, логотип, телефон, адрес",
    where: "Шапка, подвал, страница «Контакты», кнопки звонка, разметка для поисковиков и карта.",
    preview: "/contacts",
    fields: [
      { key: "company_name", label: "Название бренда", type: "text", hint: "Показывается в шапке и заголовках" },
      { key: "legal_name", label: "Юридическое название", type: "text", hint: "Например: ООО «Комплексные решения»" },
      { key: "logo_url", label: "Логотип (пусто — фирменный знак)", type: "image" },
      { key: "phone", label: "Телефон — как показывать", type: "text", hint: "Например: 8 800 600-84-77" },
      { key: "phone_href", label: "Телефон для звонка", type: "text", hint: "Цифрами с +7: +78006008477" },
      { key: "email", label: "E-mail", type: "text" },
      {
        key: "address",
        label: "Адрес",
        type: "text",
        hint: "Ссылка «Открыть в Яндекс Картах» строится по этому адресу автоматически",
      },
      { key: "work_hours", label: "Режим работы", type: "text", hint: "Пусто — строка не показывается" },
    ],
  },
  {
    id: "requisites",
    title: "Реквизиты и показатели",
    icon: BadgeCheck,
    summary: "ИНН, ОГРН, цифры компании",
    where: "Страница «О компании» (блок «Документы и реквизиты»), разметка для поисковиков, llms.txt.",
    preview: "/about",
    fields: [
      {
        key: "requisites",
        label: "Реквизиты",
        type: "list",
        itemTitle: "k",
        fields: [
          { key: "k", label: "Название (например, ИНН)", type: "text" },
          { key: "v", label: "Значение", type: "text" },
        ],
      },
      {
        key: "highlights",
        label: "Показатели — только подтверждённые цифры",
        type: "list",
        itemTitle: "label",
        max: 6,
        fields: [
          { key: "value", label: "Значение (например, 120+)", type: "text" },
          { key: "label", label: "Подпись", type: "text" },
        ],
      },
    ],
  },
  {
    id: "navigation",
    title: "Меню",
    icon: Menu,
    summary: "Пункты меню и кнопки в шапке",
    where: "Шапка сайта на всех страницах и мобильное меню.",
    preview: "/",
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
        label: "Группы в меню «Услуги»",
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
    id: "footer",
    title: "Подвал и документы",
    icon: PanelBottom,
    summary: "Ссылки, документы, соцсети",
    where: "Нижняя часть всех страниц сайта.",
    preview: "/",
    fields: [
      { key: "footer_text", label: "Описание компании", type: "textarea" },
      { key: "footer_note", label: "Примечание в самом низу", type: "text" },
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
    id: "partner",
    title: "IT-студия",
    icon: Handshake,
    summary: "Партнёр по IT-направлению",
    where: "Блок IT на главной, страница услуги «IT-решения» (блок о студии), подвал, разметка.",
    preview: "/services/it-resheniya",
    fields: [
      {
        key: "partner",
        label: "Партнёрская студия",
        type: "group",
        fields: [
          { key: "name", label: "Название", type: "text" },
          { key: "url", label: "Сайт (https://…)", type: "text" },
          { key: "about", label: "Описание студии", type: "textarea" },
          {
            key: "facts",
            label: "Факты о студии",
            type: "list",
            itemTitle: "k",
            max: 6,
            fields: [
              { key: "k", label: "Подпись", type: "text" },
              { key: "v", label: "Значение", type: "text" },
            ],
          },
          {
            key: "competencies",
            label: "Что делает студия",
            type: "list",
            itemTitle: "title",
            max: 8,
            fields: [
              { key: "title", label: "Название", type: "text" },
              { key: "text", label: "Описание", type: "textarea" },
            ],
          },
          {
            key: "cases",
            label: "Проекты студии",
            type: "list",
            itemTitle: "title",
            max: 8,
            fields: [
              { key: "title", label: "Название проекта", type: "text" },
              { key: "text", label: "Что сделано, отрасль, город", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cookies",
    title: "Cookie и аналитика",
    icon: Cookie,
    summary: "Уведомление о cookie, Метрика",
    where: "Плашка внизу экрана при первом визите. Метрика включается только после «Принять».",
    preview: "/",
    fields: [
      {
        key: "cookies",
        label: "Уведомление о cookie",
        type: "group",
        fields: [
          { key: "enabled", label: "Показывать уведомление", type: "boolean" },
          { key: "text", label: "Текст", type: "textarea" },
          { key: "accept_label", label: "Кнопка согласия", type: "text" },
          {
            key: "decline_label",
            label: "Кнопка отказа",
            type: "text",
            hint: "Показывается, только когда подключена Метрика",
          },
          { key: "link_label", label: "Текст ссылки", type: "text" },
          { key: "link_href", label: "Ссылка", type: "url", hint: "По умолчанию — раздел о cookie в политике" },
        ],
      },
      {
        key: "analytics",
        label: "Яндекс Метрика",
        type: "group",
        fields: [
          {
            key: "yandex_metrika_id",
            label: "Номер счётчика",
            type: "text",
            hint: "Только цифры. Пусто — аналитика не подключается",
          },
        ],
      },
    ],
  },
  {
    id: "labels",
    title: "Подписи на страницах",
    icon: Type,
    summary: "Заголовки блоков и кнопки",
    where: "Общие подписи всех страниц услуг и проектов. Пустое поле — текст по умолчанию (он указан под полем).",
    preview: "/services",
    fields: LABEL_GROUPS.map((group) => ({
      key: "labels",
      label: group.title,
      type: "group" as const,
      fields: group.keys.map((key) => ({
        key,
        label: LABEL_NAMES[key],
        type: "text" as const,
        hint: `По умолчанию: «${DEFAULT_LABELS[key]}»`,
      })),
    })),
  },
  {
    id: "seo",
    title: "SEO и поисковики",
    icon: Search,
    summary: "Описание сайта, коды Вебмастера",
    where: "Сниппеты в Яндексе и Google, превью в соцсетях, llms.txt для нейросетей.",
    preview: "/",
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
            label: "Описание компании",
            type: "textarea",
            hint: "Для поисковиков, соцсетей и нейросетей (llms.txt)",
          },
          { key: "og_image_url", label: "Изображение для соцсетей", type: "image" },
          {
            key: "area_served",
            label: "География работ",
            type: "text",
            hint: "Например: Москва и Московская область. Пусто — не указывается",
          },
          { key: "yandex_verification", label: "Код Яндекс Вебмастера", type: "text" },
          { key: "google_verification", label: "Код Google Search Console", type: "text" },
          { key: "bing_verification", label: "Код Bing Webmaster", type: "text" },
        ],
      },
    ],
  },
];
