import { Suspense } from "react";

import { SmoothScroll } from "@/components/animations/SmoothScroll";
import { JsonLd } from "@/components/ui/JsonLd";
import { siteGraphJsonLd } from "@/lib/seo";
import { getServices, getSiteSettings } from "@/services/content";

import { CookieConsent } from "./CookieConsent";
import { Footer } from "./Footer";
import { Header, type MenuGroup } from "./Header";

async function SiteHeader() {
  const [site, services] = await Promise.all([getSiteSettings(), getServices()]);
  const groups: MenuGroup[] = site.menu_groups
    .map((group) => ({
      title: group.title,
      note: group.note,
      items: services
        .filter((s) => s.show_in_menu && s.menu_group === group.title)
        .map((s) => ({ label: s.menu_title || s.title, href: `/services/${s.slug}` })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Header
      companyName={site.company_name}
      logoUrl={site.logo_url}
      phone={site.phone}
      phoneHref={site.phone_href}
      email={site.email}
      nav={site.nav}
      groups={groups}
      ctaLabel={site.header_cta_label}
      mobileCtaLabel={site.mobile_cta_label}
    />
  );
}

async function SiteFooter() {
  const [site, services] = await Promise.all([getSiteSettings(), getServices()]);
  // По одной (главной) услуге из каждого направления — все четыре направления видны в подвале
  const links = site.menu_groups
    .map((group) => services.find((s) => s.show_in_menu && s.menu_group === group.title))
    .filter((s) => s !== undefined)
    .map((s) => ({ label: s.menu_title || s.title, href: `/services/${s.slug}` }));
  return (
    <>
      <Footer site={site} services={links} />
      <JsonLd data={siteGraphJsonLd(site, services)} />
    </>
  );
}

async function SiteCookies() {
  const site = await getSiteSettings();
  return <CookieConsent cookies={site.cookies} metrikaId={site.analytics?.yandex_metrika_id} />;
}

function HeaderFallback() {
  return <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-[76px] bg-[rgba(7,29,54,.86)]" />;
}

/** Общая оболочка публичного сайта: шапка, подвал, плавная прокрутка. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <a
        href="#main"
        className="sr-only z-[60] rounded-[4px] bg-accent px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Перейти к содержанию
      </a>
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main">{children}</main>
      <Suspense fallback={<div className="h-[480px] bg-navy-950" />}>
        <SiteFooter />
      </Suspense>
      <SmoothScroll />
      <Suspense fallback={null}>
        <SiteCookies />
      </Suspense>
    </div>
  );
}
