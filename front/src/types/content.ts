import type { components } from "./api";

type Schemas = components["schemas"];

// Списковые поля с default_factory OpenAPI помечает необязательными, хотя API всегда их возвращает
type Out<T> = Required<T>;

export type Media = Schemas["MediaOut"];
export type KeyValue = Schemas["KeyValue"];
export type ServiceCard = Schemas["ServiceCard"];
export type Service = Out<Schemas["ServiceOut"]>;
export type ProjectCard = Schemas["ProjectCard"];
export type ProjectDetail = Out<Schemas["ProjectDetail"]>;
export type Category = Schemas["CategoryOut"];
export type ArticleCard = Schemas["ArticleCard"];
export type Article = Out<Schemas["ArticleOut"]>;
export type Faq = Schemas["FaqPublic"];
export type PageData = Out<Schemas["PageOut"]>;
export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };

/* ---------- Секции страниц (JSON-структура, редактируемая в CMS) ---------- */

export type LinkItem = { label: string; href: string; key?: string };
export type TitleTextItem = { title: string; text: string };
export type Paragraph = { text: string };

export type ProcessStep = {
  title: string;
  text: string;
  image: string;
  image_alt: string;
  specs: KeyValue[];
};

export type ReasonItem = { title: string; text: string; proof: string };

export type CtaSection = { title: string; text: string; success_title?: string };

export type LinkedItem = TitleTextItem & { href?: string };
export type ItemsSection = { title: string; text: string; items: LinkedItem[] };
export type TextSection = { title: string; paragraphs: Paragraph[] };

export type AboutBlock = {
  title: string;
  paragraphs: Paragraph[];
  image_main: string;
  image_main_alt: string;
  image_detail: string;
  image_detail_alt: string;
  caption: string;
  points_title?: string;
  points?: TitleTextItem[];
};

export type HomeSections = {
  hero: {
    title: string;
    text: string;
    image: string;
    image_alt: string;
    primary_label: string;
    primary_href: string;
    secondary_label: string;
    secondary_href: string;
    facts: LinkedItem[];
  };
  about: AboutBlock;
  directions: {
    title: string;
    text: string;
    items: { title: string; text: string; image: string; image_alt: string; href: string }[];
  };
  tasks: ItemsSection;
  projects: { title: string; link_label: string; link_href: string; empty_text?: string };
  process: {
    title: string;
    text: string;
    result_label: string;
    steps: { title: string; text: string; result: string }[];
  };
  reasons: { title: string; text: string; items: ReasonItem[] };
  it: {
    badge: string;
    title: string;
    text: string;
    link_label: string;
    link_href: string;
    items: TitleTextItem[];
  };
  faq: { title: string; text: string; link_label: string; link_href: string };
  cta: CtaSection;
};

export type PageHero = { title: string; text?: string; image?: string; image_alt?: string };

export type AboutSections = {
  hero: PageHero;
  profile: AboutBlock;
  competencies: ItemsSection;
  approach: ItemsSection;
  contractors: TextSection;
  control: ItemsSection;
  partners: { title: string; text: string; link_label: string; link_href: string };
  documents: { title: string; text: string };
  cta: CtaSection;
};

export type MetalworkSections = {
  hero: PageHero;
  services: ItemsSection;
  route: { title: string; text: string; steps: ProcessStep[] };
  quality: ItemsSection;
  gallery: { title: string; images: { url: string; alt: string }[] };
  cta: CtaSection;
};

export type ServicesSections = {
  hero: PageHero;
  cta: { title: string; text: string; label: string };
};

export type ProjectsSections = {
  hero: PageHero & { all_label: string; shown_label: string };
  empty?: { text: string };
  cta: { title: string; label: string };
};

export type BlogSections = { hero: PageHero; empty: { text: string } };
export type FaqSections = { hero: PageHero; general_title: string };
export type ContactsSections = { hero: PageHero; map: { embed_url: string; title: string }; cta: CtaSection };

export type RequestDirection = { label: string; service_slug: string; is_partner: boolean };
export type RequestSections = {
  hero: PageHero;
  directions: RequestDirection[];
  partner_note: string;
  next_steps: TitleTextItem[];
  success: { title: string; text: string };
};

export type NotFoundSections = { hero: { code: string; title: string; text: string } };
export type PrivacySections = { hero: PageHero };

export type Page<S> = Omit<PageData, "sections"> & { sections: S };

/* ---------- Настройки сайта ---------- */

export type SiteSettings = {
  company_name: string;
  legal_name: string;
  phone: string;
  phone_href: string;
  email: string;
  address: string;
  work_hours: string;
  logo_url: string;
  footer_text: string;
  footer_note: string;
  header_cta_label: string;
  mobile_cta_label: string;
  nav: LinkItem[];
  menu_groups: { title: string; note: string }[];
  footer_company: LinkItem[];
  documents: LinkItem[];
  socials: LinkItem[];
  /** Подтверждённые показатели (значение + подпись); пустой список — блок скрыт */
  highlights?: { value: string; label: string }[];
  requisites?: KeyValue[];
  seo: {
    default_title: string;
    title_template: string;
    default_description: string;
    og_image_url: string;
    /** География работ, например «Москва и Московская область»; пусто — не указывается */
    area_served?: string;
    /** Коды подтверждения в Google Search Console, Яндекс Вебмастере и Bing Webmaster */
    google_verification?: string;
    yandex_verification?: string;
    bing_verification?: string;
  };
};
