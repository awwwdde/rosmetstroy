import type { FieldDef } from "@/components/admin/SchemaFields";

/**
 * Шаблоны страниц: какие секции и поля редактируются в CMS.
 * Структура совпадает с JSON, который читают публичные страницы (src/types/content.ts).
 */

const titleText: FieldDef[] = [
  { key: "title", label: "Заголовок", type: "text" },
  { key: "text", label: "Текст", type: "textarea" },
];
const kv: FieldDef[] = [
  { key: "k", label: "Параметр", type: "text" },
  { key: "v", label: "Значение", type: "text" },
];
const link: FieldDef[] = [
  { key: "link_label", label: "Ссылка — текст", type: "text" },
  { key: "link_href", label: "Ссылка — адрес", type: "url" },
];

const processSteps: FieldDef = {
  key: "steps",
  label: "Этапы",
  type: "list",
  itemTitle: "title",
  fields: [
    { key: "title", label: "Название этапа", type: "text" },
    { key: "text", label: "Описание", type: "textarea" },
    { key: "image", label: "Фото (только реальные; без фото колонка скрывается)", type: "image" },
    { key: "image_alt", label: "Описание фото (alt)", type: "text" },
    { key: "specs", label: "Характеристики", type: "list", itemTitle: "k", fields: kv },
  ],
};

/** Заголовок, подводка и карточки с необязательной ссылкой */
const linkedItems = (key: string, label: string): FieldDef => ({
  key,
  label,
  type: "group",
  fields: [
    { key: "title", label: "Заголовок", type: "text" },
    { key: "text", label: "Подводка", type: "textarea" },
    {
      key: "items",
      label: "Карточки",
      type: "list",
      itemTitle: "title",
      fields: [...titleText, { key: "href", label: "Ссылка (необязательно)", type: "url" }],
    },
  ],
});

const reasons: FieldDef = {
  key: "reasons",
  label: "Почему с нами сотрудничают",
  type: "group",
  fields: [
    { key: "title", label: "Заголовок", type: "text" },
    { key: "text", label: "Подводка", type: "textarea" },
    {
      key: "items",
      label: "Пункты (только проверяемые утверждения)",
      type: "list",
      itemTitle: "title",
      fields: [...titleText, { key: "proof", label: "Чем подтверждается (необязательно)", type: "text" }],
    },
  ],
};

const cta: FieldDef = {
  key: "cta",
  label: "Блок заявки",
  type: "group",
  fields: [
    { key: "title", label: "Заголовок", type: "text" },
    { key: "text", label: "Текст", type: "textarea" },
    { key: "success_title", label: "Сообщение после отправки", type: "text" },
  ],
};

const heroSimple: FieldDef = {
  key: "hero",
  label: "Первый экран",
  type: "group",
  fields: [
    { key: "title", label: "Заголовок (H1)", type: "text" },
    { key: "text", label: "Подводка", type: "textarea" },
  ],
};

const heroImage: FieldDef = {
  key: "hero",
  label: "Первый экран",
  type: "group",
  fields: [
    { key: "title", label: "Заголовок (H1)", type: "text" },
    { key: "text", label: "Подводка", type: "textarea" },
    { key: "image", label: "Фоновое фото", type: "image" },
    { key: "image_alt", label: "Описание фото (alt)", type: "text" },
  ],
};

const aboutBlock = (key: string, label: string): FieldDef => ({
  key,
  label,
  type: "group",
  fields: [
    { key: "title", label: "Заголовок", type: "text" },
    { key: "paragraphs", label: "Абзацы", type: "list", fields: [{ key: "text", label: "Текст", type: "textarea" }] },
    { key: "image_main", label: "Фото 1 (только реальные)", type: "image" },
    { key: "image_main_alt", label: "Описание фото 1", type: "text" },
    { key: "image_detail", label: "Фото 2", type: "image" },
    { key: "image_detail_alt", label: "Описание фото 2", type: "text" },
    { key: "caption", label: "Подпись под фото", type: "text" },
    { key: "points_title", label: "Заголовок списка (показывается, если нет фото)", type: "text" },
    { key: "points", label: "Список справа", type: "list", itemTitle: "title", fields: titleText },
  ],
});

const textGroup = (key: string, label: string): FieldDef => ({
  key,
  label,
  type: "group",
  fields: [
    { key: "title", label: "Заголовок", type: "text" },
    { key: "paragraphs", label: "Абзацы", type: "list", fields: [{ key: "text", label: "Текст", type: "textarea" }] },
  ],
});

export const PAGE_TEMPLATES: Record<string, { fields: FieldDef[]; hasBody?: boolean; path: string }> = {
  home: {
    path: "/",
    fields: [
      {
        key: "hero",
        label: "Первый экран",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок (H1)", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          { key: "image", label: "Фото", type: "image" },
          { key: "image_alt", label: "Описание фото (alt)", type: "text" },
          { key: "primary_label", label: "Основная кнопка — текст", type: "text" },
          { key: "primary_href", label: "Основная кнопка — ссылка", type: "url" },
          { key: "secondary_label", label: "Вторая кнопка — текст", type: "text" },
          { key: "secondary_href", label: "Вторая кнопка — ссылка", type: "url" },
          {
            key: "facts",
            label: "Полоса направлений под первым экраном (первое выделено)",
            type: "list",
            itemTitle: "title",
            max: 6,
            fields: [...titleText, { key: "href", label: "Ссылка", type: "url" }],
          },
        ],
      },
      aboutBlock("about", "О компании"),
      {
        key: "directions",
        label: "Наши направления (первое — основное, крупная карточка)",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          {
            key: "items",
            label: "Карточки",
            type: "list",
            itemTitle: "title",
            fields: [
              ...titleText,
              {
                key: "image",
                label: "Фото (заполняет карточку целиком; текст ляжет на размытую синюю плашку)",
                type: "image",
              },
              { key: "image_alt", label: "Описание фото (для поисковиков и незрячих)", type: "text" },
              {
                key: "image_position",
                label: "Какую часть фото держать в кадре",
                type: "select",
                options: [
                  { value: "center", label: "Центр" },
                  { value: "top", label: "Верх" },
                  { value: "bottom", label: "Низ" },
                  { value: "left", label: "Левый край" },
                  { value: "right", label: "Правый край" },
                ],
              },
              { key: "href", label: "Ссылка", type: "url" },
            ],
          },
        ],
      },
      linkedItems("tasks", "Какие задачи решаем"),
      {
        key: "projects",
        label: "Реализованные проекты (показываются отмеченные «На главной»)",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "link_label", label: "Кнопка — текст", type: "text" },
          { key: "link_href", label: "Кнопка — ссылка", type: "url" },
          { key: "empty_text", label: "Текст, пока нет опубликованных проектов", type: "textarea" },
        ],
      },
      {
        key: "process",
        label: "Как мы работаем",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          { key: "result_label", label: "Подпись результата", type: "text" },
          {
            key: "steps",
            label: "Этапы",
            type: "list",
            itemTitle: "title",
            fields: [...titleText, { key: "result", label: "На выходе", type: "text" }],
          },
        ],
      },
      reasons,
      {
        key: "it",
        label: "Партнёрские IT-решения",
        type: "group",
        fields: [
          { key: "badge", label: "Метка", type: "text" },
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
          { key: "link_label", label: "Кнопка — текст", type: "text" },
          { key: "link_href", label: "Кнопка — ссылка", type: "url" },
          { key: "items", label: "Пункты", type: "list", itemTitle: "title", fields: titleText },
        ],
      },
      {
        key: "faq",
        label: "Частые вопросы (выводятся общие вопросы из раздела FAQ)",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          ...link,
        ],
      },
      cta,
    ],
  },
  about: {
    path: "/about",
    fields: [
      heroImage,
      aboutBlock("profile", "Профиль деятельности"),
      linkedItems("competencies", "Основные компетенции"),
      linkedItems("approach", "Комплексный подход"),
      textGroup("contractors", "Работа с подрядчиками"),
      linkedItems("control", "Контроль исполнения"),
      {
        key: "partners",
        label: "Партнёрские направления",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
          ...link,
        ],
      },
      {
        key: "documents",
        label: "Документы и реквизиты (сами реквизиты — в «Настройки сайта»)",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
        ],
      },
      cta,
    ],
  },
  metalwork: {
    path: "/metalwork",
    fields: [
      heroImage,
      linkedItems("services", "Технологические услуги"),
      {
        key: "route",
        label: "Как организуется изготовление",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          processSteps,
        ],
      },
      linkedItems("quality", "Контроль исполнения"),
      {
        key: "gallery",
        label: "Фотографии (только реальные объекты и изделия)",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          {
            key: "images",
            label: "Фотографии",
            type: "list",
            itemTitle: "alt",
            fields: [
              { key: "url", label: "Фото", type: "image" },
              { key: "alt", label: "Описание", type: "text" },
            ],
          },
        ],
      },
      cta,
    ],
  },
  services: {
    path: "/services",
    fields: [
      heroSimple,
      {
        key: "cta",
        label: "Призыв к действию",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
          { key: "label", label: "Кнопка", type: "text" },
        ],
      },
    ],
  },
  projects: {
    path: "/projects",
    fields: [
      {
        key: "hero",
        label: "Первый экран",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок (H1)", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
          { key: "all_label", label: "Фильтр «Все»", type: "text" },
          { key: "shown_label", label: "Подпись счётчика", type: "text" },
        ],
      },
      {
        key: "empty",
        label: "Пока нет опубликованных проектов",
        type: "group",
        fields: [{ key: "text", label: "Текст", type: "textarea" }],
      },
      {
        key: "cta",
        label: "Призыв к действию",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "label", label: "Кнопка", type: "text" },
        ],
      },
    ],
  },
  blog: {
    path: "/blog",
    fields: [
      heroSimple,
      { key: "empty", label: "Пустой список", type: "group", fields: [{ key: "text", label: "Текст", type: "text" }] },
    ],
  },
  faq: {
    path: "/faq",
    fields: [heroSimple, { key: "general_title", label: "Заголовок общих вопросов", type: "text" }],
  },
  contacts: {
    path: "/contacts",
    fields: [
      heroSimple,
      {
        key: "map",
        label: "Карта",
        type: "group",
        fields: [
          { key: "title", label: "Подпись", type: "text" },
          { key: "embed_url", label: "Ссылка для встраивания (Яндекс Карты / Google Maps, https)", type: "url" },
        ],
      },
      cta,
    ],
  },
  request: {
    path: "/request",
    fields: [
      heroSimple,
      {
        key: "directions",
        label: "Направления в форме",
        type: "list",
        itemTitle: "label",
        fields: [
          { key: "label", label: "Подпись", type: "text" },
          { key: "service_slug", label: "Адрес услуги (slug), если есть", type: "text" },
          { key: "is_partner", label: "Услуга партнёра", type: "boolean" },
        ],
      },
      { key: "partner_note", label: "Пояснение для услуг партнёра", type: "textarea" },
      { key: "next_steps", label: "Что произойдёт дальше", type: "list", itemTitle: "title", fields: titleText },
      {
        key: "success",
        label: "Сообщение после отправки",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
        ],
      },
    ],
  },
  privacy: {
    path: "/privacy",
    hasBody: true,
    fields: [
      {
        key: "hero",
        label: "Первый экран",
        type: "group",
        fields: [{ key: "title", label: "Заголовок", type: "text" }],
      },
    ],
  },
  consent: {
    path: "/consent",
    hasBody: true,
    fields: [
      {
        key: "hero",
        label: "Первый экран",
        type: "group",
        fields: [{ key: "title", label: "Заголовок", type: "text" }],
      },
    ],
  },
  custom: {
    path: "",
    hasBody: true,
    fields: [
      {
        key: "hero",
        label: "Первый экран",
        type: "group",
        fields: [
          { key: "title", label: "Заголовок (H1)", type: "text" },
          { key: "text", label: "Подводка", type: "textarea" },
        ],
      },
    ],
  },
  "not-found": {
    path: "/404",
    fields: [
      {
        key: "hero",
        label: "Содержимое",
        type: "group",
        fields: [
          { key: "code", label: "Код", type: "text" },
          { key: "title", label: "Заголовок", type: "text" },
          { key: "text", label: "Текст", type: "textarea" },
        ],
      },
    ],
  },
};

/** Адрес страницы на сайте: у системных — из шаблона, у своих — /slug. */
export function pagePath(template: string, slug: string): string {
  return template === "custom" ? `/${slug}` : (PAGE_TEMPLATES[template]?.path ?? `/${slug}`);
}
