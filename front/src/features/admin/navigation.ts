import {
  CircleHelp,
  FilePlus2,
  FileText,
  FolderKanban,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Newspaper,
  ScrollText,
  Settings,
  Tags,
  Users,
  Wrench,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  /** Дополнительные слова для поиска в палитре команд */
  keywords?: string;
};

export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Работа",
    items: [
      { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true, keywords: "дашборд главная статистика" },
      { href: "/admin/leads", label: "Заявки", icon: Inbox, keywords: "обращения лиды клиенты" },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/pages", label: "Страницы", icon: FileText, keywords: "главная о компании тексты seo" },
      { href: "/admin/services", label: "Услуги", icon: Wrench, keywords: "направления металлоконструкции" },
      { href: "/admin/projects", label: "Проекты", icon: FolderKanban, keywords: "кейсы объекты галерея" },
      { href: "/admin/categories", label: "Категории", icon: Tags, keywords: "фильтры проектов" },
      { href: "/admin/articles", label: "Блог", icon: Newspaper, keywords: "статьи новости" },
      { href: "/admin/faq", label: "Вопросы и ответы", icon: CircleHelp, keywords: "faq" },
      { href: "/admin/media", label: "Медиатека", icon: ImageIcon, keywords: "фото изображения файлы загрузка" },
    ],
  },
  {
    title: "Система",
    items: [
      {
        href: "/admin/settings",
        label: "Настройки сайта",
        icon: Settings,
        adminOnly: true,
        keywords: "контакты телефон логотип меню реквизиты",
      },
      { href: "/admin/users", label: "Пользователи", icon: Users, adminOnly: true, keywords: "доступ роли" },
      { href: "/admin/audit", label: "Журнал действий", icon: ScrollText, adminOnly: true, keywords: "аудит история" },
    ],
  },
];

export const CREATE_ACTIONS: NavItem[] = [
  { href: "/admin/services/new", label: "Новая услуга", icon: FilePlus2, keywords: "создать добавить" },
  { href: "/admin/projects/new", label: "Новый проект", icon: FilePlus2, keywords: "создать добавить кейс" },
  { href: "/admin/articles/new", label: "Новая статья", icon: FilePlus2, keywords: "создать добавить блог" },
];

export function findNavItem(pathname: string): { group: NavGroup; item: NavItem } | null {
  let best: { group: NavGroup; item: NavItem } | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const match = item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}
