"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { useUiStore } from "@/features/ui-store";
import { cn } from "@/lib/utils";
import type { LinkItem } from "@/types/content";

import { Logo } from "./Logo";

export type MenuGroup = { title: string; note: string; items: LinkItem[] };

type Props = {
  companyName: string;
  logoUrl: string;
  phone: string;
  phoneHref: string;
  email: string;
  nav: LinkItem[];
  groups: MenuGroup[];
  ctaLabel: string;
  mobileCtaLabel: string;
};

// Страницы с тёмным полноэкранным первым экраном: шапка прозрачна, пока страница не прокручена
const TRANSPARENT_ROUTES = [/^\/$/, /^\/about$/, /^\/metalwork$/, /^\/projects\/[^/]+$/];

function activeKey(pathname: string): string {
  const segment = pathname.split("/")[1] ?? "";
  return segment;
}

export function Header({
  companyName,
  logoUrl,
  phone,
  phoneHref,
  email,
  nav,
  groups,
  ctaLabel,
  mobileCtaLabel,
}: Props) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const setScrollLocked = useUiStore((s) => s.setScrollLocked);
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const megaId = useId();
  const mobileId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Закрываем меню при переходе на другую страницу
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMega(false);
    setMobile(false);
  }

  useEffect(() => {
    setScrollLocked(mobile);
    return () => setScrollLocked(false);
  }, [mobile, setScrollLocked]);

  useEffect(() => {
    if (!mega && !mobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mega, mobile]);

  const transparentRoute = TRANSPARENT_ROUTES.some((re) => re.test(pathname));
  const solid = !transparentRoute || scrolled || mega || mobile;
  const current = activeKey(pathname);
  const duration = reduceMotion ? 0 : 0.35;

  return (
    <header
      onMouseLeave={() => setMega(false)}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b font-sans text-white min-[1080px]:transition-[background-color,border-color] min-[1080px]:duration-[350ms]",
        // На телефоне шапка почти непрозрачная: текст страницы не просвечивает рядом с логотипом
        solid
          ? "border-sky/12 bg-[rgba(7,29,54,.97)] backdrop-blur-[14px] min-[1080px]:bg-[rgba(7,29,54,.86)]"
          : "border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1440px] items-center justify-between gap-6 transition-[padding] duration-[350ms]",
          scrolled
            ? "px-5 py-3 min-[1080px]:px-12 min-[1080px]:py-3.5"
            : "px-5 py-4 min-[1080px]:px-12 min-[1080px]:py-7",
        )}
      >
        <Logo name={companyName} logoUrl={logoUrl} />

        <nav aria-label="Основная навигация" className="hidden items-center gap-9 text-[15px] min-[1080px]:flex">
          {nav.map((item) =>
            item.key === "services" ? (
              <button
                key={item.href}
                type="button"
                aria-expanded={mega}
                aria-controls={megaId}
                onMouseEnter={() => setMega(true)}
                onClick={() => setMega((v) => !v)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-[inherit] transition-colors",
                  mega || current === "services" ? "text-white" : "text-white/72 hover:text-white",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "-mt-[3px] size-1.5 border-r-[1.5px] border-b-[1.5px] border-current transition-transform duration-250",
                    mega ? "-rotate-[135deg]" : "rotate-45",
                  )}
                />
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "no-underline transition-colors hover:text-white",
                  current === item.key ? "text-white" : "text-white/72",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={`tel:${phoneHref}`}
            className="hidden text-sm text-white/75 no-underline hover:text-white min-[1080px]:inline"
          >
            {phone}
          </a>
          <Link
            href="/request"
            className="hidden h-11 items-center gap-2.5 rounded-[4px] border border-white/50 px-5 text-sm font-medium whitespace-nowrap text-white no-underline transition-[background-color,border-color] duration-200 hover:border-accent hover:bg-accent hover:text-white sm:flex"
          >
            {ctaLabel}
            <span aria-hidden="true" className="text-base">
              →
            </span>
          </Link>
          <button
            type="button"
            aria-label={mobile ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={mobile}
            aria-controls={mobileId}
            onClick={() => setMobile((v) => !v)}
            className="flex size-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[4px] border border-white/30 bg-transparent min-[1080px]:hidden"
          >
            <span
              className={cn(
                "h-[1.5px] w-[18px] bg-white transition-transform duration-300",
                mobile && "translate-y-[3.75px] rotate-45",
              )}
            />
            <span
              className={cn(
                "h-[1.5px] w-[18px] bg-white transition-transform duration-300",
                mobile && "-translate-y-[3.75px] -rotate-45",
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mega ? (
          <motion.div
            id={megaId}
            key="mega"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration, ease: [0.2, 0.7, 0.2, 1] }}
            className="hidden overflow-hidden border-t border-sky/14 bg-[rgba(7,29,54,.96)] backdrop-blur-[18px] min-[1080px]:block"
          >
            <div className="mx-auto grid max-w-[1440px] grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 px-12 pt-10 pb-12">
              {groups.map((group, index) => (
                <div key={group.title} className="flex flex-col gap-[18px]">
                  <div className="border-b border-sky/20 pb-3.5 text-[13px] text-sky">{group.title}</div>
                  <div
                    className={cn(
                      "grid gap-x-8 gap-y-3",
                      index === 0 && group.items.length > 2 ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="py-1 text-base leading-[1.35] text-white no-underline hover:text-sky"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="text-[13px] leading-normal text-pretty text-white/55">{group.note}</div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobile ? (
          <motion.div
            id={mobileId}
            key="mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex h-[calc(100dvh-72px)] flex-col gap-7 overflow-auto bg-navy-950 px-5 pt-6 pb-10 min-[1080px]:hidden"
            data-lenis-prevent
          >
            <nav aria-label="Мобильная навигация" className="flex flex-col">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobile(false)}
                  className="flex items-center justify-between border-b border-sky/14 py-[18px] text-[26px] font-medium tracking-[-.01em] text-white no-underline hover:text-sky"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-1.5 text-[15px] text-white/70">
              <a href={`tel:${phoneHref}`} className="text-xl text-white no-underline">
                {phone}
              </a>
              <a href={`mailto:${email}`} className="text-sky no-underline">
                {email}
              </a>
            </div>
            <Link
              href="/request"
              onClick={() => setMobile(false)}
              className="flex h-14 shrink-0 items-center justify-center rounded-[4px] bg-accent font-medium text-white no-underline hover:bg-accent-dark hover:text-white"
            >
              {mobileCtaLabel}
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
