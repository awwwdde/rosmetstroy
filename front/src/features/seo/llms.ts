import "server-only";

import { SITE_URL, absoluteUrl, plainText } from "@/lib/seo";
import { shown } from "@/lib/utils";
import {
  getArticle,
  getArticles,
  getCustomPages,
  getFaq,
  getPage,
  getProject,
  getProjects,
  getService,
  getServices,
  getSiteSettings,
} from "@/services/content";
import type {
  AboutSections,
  ItemsSection,
  MetalworkSections,
  Service,
  ServiceCard,
  SiteSettings,
} from "@/types/content";

/*
 * llms.txt (https://llmstxt.org) — описание сайта для нейросетей и AI-поиска в Markdown.
 * Всё собирается из CMS: изменения контента сразу попадают и сюда.
 *  - /llms.txt       — краткая карта: кто компания, что делает, ссылки на ключевые страницы;
 *  - /llms-full.txt  — полный текст услуг, проектов, вопросов и статей одним документом.
 */

const line = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const link = (title: string, path: string, note?: string) =>
  `- [${line(title)}](${absoluteUrl(path)})${note && line(note) ? `: ${line(note)}` : ""}`;

function facts(site: SiteSettings, services: ServiceCard[]): string[] {
  const own = services.filter((s) => !s.is_partner);
  const partner = services.filter((s) => s.is_partner);
  const directions = site.menu_groups.map((g) => g.title).filter((t) => t && t !== "Партнёр");
  const rows = [
    site.legal_name && `- Юридическое название: ${site.legal_name}`,
    directions.length && `- Направления: ${directions.join(", ")}`,
    own.length && `- Услуги компании: ${own.map((s) => s.title).join("; ")}`,
    site.seo.area_served && `- География работ: ${site.seo.area_served}`,
    site.address && `- Адрес: ${site.address}`,
    site.phone && `- Телефон: ${site.phone}`,
    site.email && `- E-mail: ${site.email}`,
    site.work_hours && `- Режим работы: ${site.work_hours}`,
    `- Сайт: ${SITE_URL}`,
    ...(site.requisites ?? []).filter((r) => r.v.trim()).map((r) => `- ${r.k}: ${r.v}`),
  ];
  const result = rows.filter((r): r is string => Boolean(r));
  if (partner.length) {
    // Важно для корректных ответов нейросетей: IT-услуги — не собственная компетенция компании
    result.push(
      `- Услуги «${partner.map((s) => s.title).join("», «")}» оказывает партнёрская студия, а не ${site.company_name}.`,
    );
  }
  return result;
}

const PAGES: { path: string; slug: string; fallback: string }[] = [
  { path: "/about", slug: "about", fallback: "О компании" },
  { path: "/metalwork", slug: "metalwork", fallback: "Работа с металлом" },
  { path: "/services", slug: "services", fallback: "Услуги" },
  { path: "/projects", slug: "projects", fallback: "Проекты" },
  { path: "/faq", slug: "faq", fallback: "Вопросы и ответы" },
  { path: "/blog", slug: "blog", fallback: "Блог" },
  { path: "/contacts", slug: "contacts", fallback: "Контакты" },
  { path: "/request", slug: "request", fallback: "Отправить проект на расчёт" },
];

export async function buildLlmsTxt(): Promise<string> {
  const [site, services, projects, articles, customPages, pages] = await Promise.all([
    getSiteSettings(),
    getServices(),
    getProjects(),
    getArticles(1, 50),
    getCustomPages(),
    Promise.all(PAGES.map((p) => getPage<{ hero?: { text?: string } }>(p.slug))),
  ]);

  const out = [
    `# ${site.company_name}`,
    "",
    `> ${line(site.seo.default_description || site.footer_text)}`,
    "",
    ...facts(site, services),
    "",
    "## Услуги",
    "",
    ...services.map((s) => link(s.title, `/services/${s.slug}`, s.summary || s.subtitle)),
    "",
    "## Разделы сайта",
    "",
    ...PAGES.map((p, i) => {
      const page = pages[i];
      return page && page.is_published
        ? link(page.title || p.fallback, p.path, page.seo_description || page.sections.hero?.text)
        : null;
    }).filter((row): row is string => row !== null),
    ...customPages.map((p) => link(p.title, `/${p.slug}`)),
  ];

  if (projects.length) {
    out.push("", "## Реализованные проекты", "");
    out.push(
      ...projects.map((p) =>
        link(p.title, `/projects/${p.slug}`, [p.type_label, p.location, p.works_summary].filter(Boolean).join(" · ")),
      ),
    );
  }
  if (articles.items.length) {
    out.push("", "## Статьи", "");
    out.push(...articles.items.map((a) => link(a.title, `/blog/${a.slug}`, a.excerpt)));
  }
  out.push(
    "",
    "## Optional",
    "",
    link("Полный текст сайта для нейросетей", "/llms-full.txt", "услуги, проекты, вопросы и статьи одним документом"),
    link("Карта сайта", "/sitemap.xml"),
    "",
  );
  return out.join("\n");
}

function itemsBlock(section: ItemsSection | undefined): string[] {
  if (!shown(section)) return [];
  return [
    `### ${line(section.title)}`,
    "",
    ...(section.text ? [line(section.text), ""] : []),
    ...section.items.map((i) => `- **${line(i.title)}** — ${line(i.text)}`),
    "",
  ];
}

function serviceBlock(service: Service): string[] {
  const list = (title: string, items: { title: string; description: string }[]) =>
    items.length
      ? [
          `**${title}:**`,
          ...items.map((i) => `- ${line(i.title)}${i.description ? ` — ${line(i.description)}` : ""}`),
          "",
        ]
      : [];
  return [
    `### ${line(service.title)}`,
    "",
    `Адрес: ${absoluteUrl(`/services/${service.slug}`)}`,
    ...(service.is_partner ? ["Услугу оказывает партнёрская студия."] : []),
    "",
    ...[service.subtitle, service.summary, service.description].filter(Boolean).map((t) => `${plainText(t)}\n`),
    ...list("Задачи", service.tasks),
    ...list("Состав работ", service.scope),
    ...list("Ограничения", service.limitations),
    ...(service.execution_note ? [plainText(service.execution_note), ""] : []),
    ...(service.specs.length
      ? ["**Параметры:**", ...service.specs.map((s) => `- ${line(s.k)}: ${line(s.v)}`), ""]
      : []),
    ...list("Этапы", service.stages),
    ...(service.faq.length
      ? [
          "**Вопросы и ответы:**",
          "",
          ...service.faq.flatMap((f) => [`Вопрос: ${line(f.question)}`, `Ответ: ${line(f.answer)}`, ""]),
        ]
      : []),
  ];
}

export async function buildLlmsFullTxt(): Promise<string> {
  const [summary, site, services, projects, faq, articles, about, metalwork] = await Promise.all([
    buildLlmsTxt(),
    getSiteSettings(),
    getServices(),
    getProjects(),
    getFaq(),
    getArticles(1, 50),
    getPage<AboutSections>("about"),
    getPage<MetalworkSections>("metalwork"),
  ]);
  const [serviceDetails, projectDetails, articleDetails] = await Promise.all([
    Promise.all(services.map((s) => getService(s.slug))),
    Promise.all(projects.map((p) => getProject(p.slug))),
    Promise.all(articles.items.map((a) => getArticle(a.slug))),
  ]);

  const out = [summary, "---", ""];

  if (about?.is_published) {
    const s = about.sections;
    out.push(`## ${line(about.title)}`, "", `Адрес: ${absoluteUrl("/about")}`, "");
    if (shown(s.profile)) {
      out.push(`### ${line(s.profile.title)}`, "", ...s.profile.paragraphs.map((p) => `${line(p.text)}\n`));
      if (s.profile.points?.length)
        out.push(...s.profile.points.map((p) => `- **${line(p.title)}** — ${line(p.text)}`), "");
    }
    out.push(...itemsBlock(s.competencies), ...itemsBlock(s.approach));
    if (shown(s.contractors))
      out.push(`### ${line(s.contractors.title)}`, "", ...s.contractors.paragraphs.map((p) => `${line(p.text)}\n`));
    out.push(...itemsBlock(s.control));
  }

  if (metalwork?.is_published) {
    const s = metalwork.sections;
    out.push(`## ${line(metalwork.title)}`, "", `Адрес: ${absoluteUrl("/metalwork")}`, "");
    if (s.hero.text) out.push(line(s.hero.text), "");
    out.push(...itemsBlock(s.services));
    if (shown(s.route)) {
      out.push(`### ${line(s.route.title)}`, "", ...(s.route.text ? [line(s.route.text), ""] : []));
      out.push(...s.route.steps.map((step, i) => `${i + 1}. **${line(step.title)}** — ${line(step.text)}`), "");
    }
    out.push(...itemsBlock(s.quality));
  }

  out.push("## Услуги подробно", "");
  for (const service of serviceDetails) if (service) out.push(...serviceBlock(service));

  const realProjects = projectDetails.filter((p) => p !== null);
  if (realProjects.length) {
    out.push("## Реализованные проекты подробно", "");
    for (const p of realProjects) {
      out.push(`### ${line(p.title)}`, "", `Адрес: ${absoluteUrl(`/projects/${p.slug}`)}`);
      if (p.type_label) out.push(`Тип объекта: ${line(p.type_label)}`);
      if (p.location) out.push(`Место: ${line(p.location)}`);
      out.push("");
      for (const [title, text] of [
        ["Задача", p.intro],
        ["Роль компании", p.company_role],
        ["Особенности", p.features],
        ["Решение", p.solution],
        ["Результат", p.result],
      ] as const) {
        if (text) out.push(`**${title}:** ${plainText(text)}`, "");
      }
      if (p.params.length) out.push(...p.params.map((x) => `- ${line(x.k)}: ${line(x.v)}`), "");
      if (p.works.length) out.push("**Выполненные работы:**", ...p.works.map((w) => `- ${line(w.title)}`), "");
    }
  }

  const general = faq.filter((f) => f.service_id === null);
  if (general.length) {
    out.push("## Частые вопросы", "", `Адрес: ${absoluteUrl("/faq")}`, "");
    for (const f of general) out.push(`Вопрос: ${line(f.question)}`, `Ответ: ${line(f.answer)}`, "");
  }

  const posts = articleDetails.filter((a) => a !== null);
  if (posts.length) {
    out.push("## Статьи", "");
    for (const a of posts) {
      out.push(`### ${line(a.title)}`, "", `Адрес: ${absoluteUrl(`/blog/${a.slug}`)}`, "", plainText(a.body_html), "");
    }
  }

  out.push("## Контакты", "", ...facts(site, services).filter((r) => /Адрес|Телефон|E-mail|Режим/.test(r)), "");
  out.push(`Заявка на расчёт: ${absoluteUrl("/request")}`, "");
  return out.join("\n");
}
