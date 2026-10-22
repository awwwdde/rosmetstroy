import type { components } from "@/types/api";

type S = components["schemas"];
type Out<T> = Required<T>;

export type Me = S["MeOut"];
export type User = S["UserOut"];
export type Media = S["MediaOut"];
export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };

export type LeadListItem = S["LeadListItem"];
export type Lead = Out<S["LeadOut"]>;
export type LeadComment = S["LeadCommentOut"];
export type LeadStatus = S["LeadStatusUpdate"]["status"];

export type PageListItem = S["PageListItem"];
export type PageData = Out<S["PageOut"]>;

export type ServiceCard = S["ServiceCard"];
export type ServiceAdmin = Out<S["ServiceAdminOut"]>;
export type ServiceIn = S["ServiceIn"];

export type ProjectCard = S["ProjectCard"];
export type ProjectAdmin = Out<S["ProjectAdminOut"]>;
export type ProjectIn = S["ProjectIn"];

export type Category = S["CategoryOut"];
export type CategoryIn = S["CategoryIn"];

export type ArticleCard = S["ArticleCard"];
export type ArticleAdmin = Out<S["ArticleAdminOut"]>;
export type ArticleIn = S["ArticleIn"];

export type Faq = S["FaqOut"];
export type FaqIn = S["FaqIn"];

export type Setting = S["SettingOut"];
export type Audit = S["AuditOut"];
export type Dashboard = S["DashboardOut"];

export const LEAD_STATUSES: { value: LeadStatus; label: string; tone: string; color: string }[] = [
  { value: "new", label: "Новая", tone: "bg-[#e7f1ff] text-[#0060d6]", color: "#087cff" },
  { value: "in_progress", label: "В работе", tone: "bg-[#fff3d9] text-[#8a5a00]", color: "#f0a020" },
  { value: "quoted", label: "КП отправлено", tone: "bg-[#eaf2fb] text-[#326fa7]", color: "#7aa7d6" },
  { value: "done", label: "Договор", tone: "bg-[#e3f6ec] text-[#16794a]", color: "#22a06b" },
  { value: "rejected", label: "Отказ", tone: "bg-[#eef2f6] text-[#4a5866]", color: "#a3afbd" },
  { value: "spam", label: "Спам", tone: "bg-danger-bg text-danger", color: "#e5484d" },
];

export const leadStatus = (value: string) => LEAD_STATUSES.find((s) => s.value === value) ?? LEAD_STATUSES[0];
