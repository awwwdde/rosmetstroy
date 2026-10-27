"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { SERVER_CHOICE, readChoice, saveChoice, subscribe } from "@/features/cookies/consent-store";
import type { SiteSettings } from "@/types/content";

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

/** Яндекс Метрика: подключается только после «Принять». Вебвизор выключен — он записывает ввод в формы. */
function loadMetrika(id: number) {
  if (window.ym || document.getElementById("ym-tag")) return;
  const queue: unknown[] = [];
  const ym = (...args: unknown[]) => {
    queue.push(args);
  };
  Object.assign(ym, { a: queue, l: Date.now() });
  window.ym = ym as unknown as Window["ym"];
  const script = document.createElement("script");
  script.id = "ym-tag";
  script.async = true;
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(script);
  window.ym?.(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
}

export function CookieConsent({ cookies, metrikaId }: { cookies: SiteSettings["cookies"]; metrikaId?: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => SERVER_CHOICE);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const counter = Number(metrikaId) || 0;

  useEffect(() => {
    if (choice === "all" && counter) loadMetrika(counter);
  }, [choice, counter]);

  // Переходы внутри сайта без перезагрузки — отдельные просмотры страниц
  useEffect(() => {
    if (choice === "all" && counter) window.ym?.(counter, "hit", window.location.href);
  }, [pathname, choice, counter]);

  const visible = Boolean(cookies?.enabled) && choice === null;
  // Без аналитики выбирать нечего: остаётся одна кнопка
  const hasOptional = Boolean(counter);

  return (
    <AnimatePresence>
      {visible && cookies ? (
        <motion.div
          role="region"
          aria-label="Уведомление о cookie-файлах"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          className="fixed inset-x-3 bottom-3 z-[60] flex flex-col gap-4 rounded-[6px] border border-sky/16 bg-navy-950/96 p-5 text-white shadow-[0_18px_50px_rgba(7,29,54,.35)] backdrop-blur-[14px] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[440px] sm:p-6"
        >
          <p className="m-0 text-[14px] leading-[1.55] text-white/80">
            {cookies.text}{" "}
            {cookies.link_href ? (
              <Link href={cookies.link_href} className="text-sky underline underline-offset-2 hover:text-white">
                {cookies.link_label || "Подробнее"}
              </Link>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => saveChoice("all")}
              className="h-11 cursor-pointer rounded-[4px] border-0 bg-accent px-5 font-[inherit] text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              {cookies.accept_label || "Принять"}
            </button>
            {hasOptional ? (
              <button
                type="button"
                onClick={() => saveChoice("necessary")}
                className="h-11 cursor-pointer rounded-[4px] border border-white/30 bg-transparent px-5 font-[inherit] text-sm font-medium text-white transition-colors hover:border-white"
              >
                {cookies.decline_label || "Только необходимые"}
              </button>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Ссылка в подвале: повторно открыть уведомление и изменить выбор. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => saveChoice(null)}
      className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-inherit hover:text-white"
    >
      Настройки cookie
    </button>
  );
}
