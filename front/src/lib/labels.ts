import type { SiteSettings } from "@/types/content";

/**
 * Подписи интерфейса, общие для однотипных страниц (все услуги, все проекты).
 * Меняются в «Настройках сайта → Подписи на страницах»; пустое поле — текст по умолчанию.
 */
export const DEFAULT_LABELS = {
  service_cta: "Рассчитать стоимость",
  service_faq_button: "Вопросы",
  service_about: "Об услуге",
  service_tasks: "Какие задачи решает",
  service_scope: "Состав работ",
  service_execution: "Как организуется выполнение",
  service_limitations: "Особенности и ограничения",
  service_specs: "Технические характеристики",
  service_related: "Проекты по направлению",
  service_faq: "Частые вопросы",
  service_form_button: "Отправить документацию",
  partner_competencies: "Что делает студия",
  partner_cases: "Среди проектов студии",
  project_task: "Задача заказчика",
  project_role: "Роль «Росметстрой»",
  project_solution: "Организация работ",
  project_result: "Результат",
  project_next: "Следующий проект",
  direction_main: "Основное направление",
  request_next: "Что произойдёт дальше",
} as const;

export type LabelKey = keyof typeof DEFAULT_LABELS;
export type Labels = Record<LabelKey, string>;

export function labelsOf(site: SiteSettings | null | undefined): Labels {
  const custom = site?.labels ?? {};
  return Object.fromEntries(
    (Object.keys(DEFAULT_LABELS) as LabelKey[]).map((key) => [key, custom[key]?.trim() || DEFAULT_LABELS[key]]),
  ) as Labels;
}

/** Где показывается подпись — для формы в админке */
export const LABEL_NAMES: Labels = {
  service_cta: "Кнопка расчёта на первом экране",
  service_faq_button: "Кнопка перехода к вопросам",
  service_about: "Заголовок блока с описанием",
  service_tasks: "Заголовок блока задач",
  service_scope: "Заголовок состава работ",
  service_execution: "Заголовок этапов выполнения",
  service_limitations: "Заголовок особенностей и ограничений",
  service_specs: "Заголовок технических характеристик",
  service_related: "Заголовок связанных проектов",
  service_faq: "Заголовок вопросов",
  service_form_button: "Кнопка в форме внизу страницы",
  partner_competencies: "Заголовок компетенций студии",
  partner_cases: "Заголовок проектов студии",
  project_task: "Подпись задачи заказчика",
  project_role: "Подпись роли компании",
  project_solution: "Подпись организации работ",
  project_result: "Подпись результата",
  project_next: "Ссылка на следующий проект",
  direction_main: "Метка основного направления",
  request_next: "Заголовок «что дальше» на странице заявки",
};

/** Группы подписей для формы в админке */
export const LABEL_GROUPS: { title: string; keys: LabelKey[] }[] = [
  {
    title: "Страница услуги",
    keys: [
      "service_cta",
      "service_faq_button",
      "service_about",
      "service_tasks",
      "service_scope",
      "service_execution",
      "service_limitations",
      "service_specs",
      "service_related",
      "service_faq",
      "service_form_button",
    ],
  },
  { title: "Партнёрская IT-студия", keys: ["partner_competencies", "partner_cases"] },
  {
    title: "Страница проекта",
    keys: ["project_task", "project_role", "project_solution", "project_result", "project_next"],
  },
  { title: "Главная и заявка", keys: ["direction_main", "request_next"] },
];
