"use client";

import { type ElementType, type ReactNode, useEffect, useRef } from "react";

type Props = {
  children: ReactNode;
  as?: Extract<ElementType, "div" | "section" | "li" | "article" | "header">;
  className?: string;
  delay?: number;
  id?: string;
};

/**
 * Появление блока при прокрутке (как data-reveal в дизайне: opacity 0→1, сдвиг 28px, .9s).
 *
 * Без GSAP: IntersectionObserver и CSS-переход ([data-reveal] в globals.css). Первое срабатывание
 * наблюдателя сообщает положение блока без принудительной перекомпоновки; блоки, видимые сразу
 * после загрузки, не анимируются. Скрытие — только прозрачностью: содержимое остаётся доступным
 * скринридерам и поисковикам. При prefers-reduced-motion анимации нет.
 */
export function Reveal({ children, as: Tag = "div", className, delay = 0, id }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          // Уже на экране (или выше) — оставляем как есть
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            observer.disconnect();
            return;
          }
          el.dataset.reveal = "hidden";
          return;
        }
        if (entry.isIntersecting) {
          if (delay) el.style.transitionDelay = `${delay}s`;
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  // Все допустимые теги — блочные элементы; тип div используется только для ref
  const Component = Tag as "div";
  return (
    <Component ref={ref} id={id} className={className}>
      {children}
    </Component>
  );
}
