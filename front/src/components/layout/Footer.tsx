import Link from "next/link";

import { SmartLink } from "@/components/ui/SmartLink";
import { PartnerLink } from "@/components/ui/PartnerLink";
import type { LinkItem, SiteSettings } from "@/types/content";

import { CookieSettingsButton } from "./CookieConsent";
import { Logo } from "./Logo";

type Props = { site: SiteSettings; services: LinkItem[] };

function Column({ title, items, children }: { title: string; items: LinkItem[]; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 text-[15px]">
      <div className="mb-2 text-[13px] text-sky">{title}</div>
      {items.map((item) => (
        <SmartLink
          key={item.href + item.label}
          href={item.href}
          className="text-white/80 no-underline hover:text-white"
        >
          {item.label}
        </SmartLink>
      ))}
      {children}
    </div>
  );
}

export function Footer({ site, services }: Props) {
  return (
    <footer className="border-t border-sky/12 bg-navy-950 font-sans text-white">
      <div className="container-site flex flex-col gap-16 pt-20 pb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-8 gap-y-12">
          <div className="flex min-w-0 flex-col gap-5 sm:col-span-2">
            {site.logo_url ? (
              <Logo name={site.company_name} logoUrl={site.logo_url} />
            ) : (
              <Link href="/" aria-label={`${site.company_name} — на главную`} className="self-start">
                {/* Основной логотип из брендбука: знак, надпись и дескриптор */}
                {/* eslint-disable-next-line @next/next/no-img-element -- векторный SVG без оптимизации */}
                <img src="/brand/logo-white.svg" alt="" width={764} height={128} className="h-[46px] w-auto" />
              </Link>
            )}
            <p className="m-0 max-w-[360px] text-[15px] leading-relaxed text-pretty text-white/60">
              {site.footer_text}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              <a
                href={`tel:${site.phone_href}`}
                className="text-2xl font-medium tracking-[-.01em] text-white no-underline hover:text-white"
              >
                {site.phone}
              </a>
              <a href={`mailto:${site.email}`} className="text-[15px] text-sky no-underline hover:text-white">
                {site.email}
              </a>
              <span className="text-[15px] text-white/60">{site.address}</span>
            </div>
          </div>
          <Column title="Услуги" items={services} />
          <Column title="Компания" items={site.footer_company} />
          <Column title="Документы" items={site.documents}>
            <Link
              href="/request"
              className="mt-3 flex items-center gap-2.5 font-medium text-white no-underline hover:text-sky"
            >
              Отправить ТЗ на расчёт →
            </Link>
          </Column>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-sky/12 pt-6 text-[13px] text-white/45">
          <span>© {site.legal_name}</span>
          {site.socials.length ? (
            <span className="flex gap-4">
              {site.socials.map((s) => (
                <SmartLink key={s.href} href={s.href} className="text-white/60 no-underline hover:text-white">
                  {s.label}
                </SmartLink>
              ))}
            </span>
          ) : null}
          <CookieSettingsButton />
          <span>
            {site.footer_note}
            {site.partner?.url ? (
              <>
                {" "}
                <PartnerLink
                  partner={site.partner}
                  className="text-white/70 underline-offset-4 hover:text-white hover:underline"
                />
              </>
            ) : null}
          </span>
        </div>
      </div>
    </footer>
  );
}
