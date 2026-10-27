"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Props = { children: ReactNode; className?: string; distance?: number };

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

/**
 * Параллакс слоя относительно прокрутки секции (в дизайне — translateY(scrollY * 0.12)).
 * На мобильных и при prefers-reduced-motion слой неподвижен, а GSAP вообще не загружается:
 * библиотека подгружается отдельным чанком уже после первой отрисовки.
 */
export function Parallax({ children, className, distance = 120 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section || !window.matchMedia(QUERY).matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const tween = gsap.to(el, {
        y: distance,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
