"use client";

import type Lenis from "lenis";
import { useEffect } from "react";

import { useUiStore } from "@/features/ui-store";

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/**
 * Плавная прокрутка Lenis — только на desktop с точным указателем и без prefers-reduced-motion.
 * Синхронизирована с ScrollTrigger через тикер GSAP. Lenis и GSAP загружаются отдельным чанком
 * и только там, где нужны: на телефонах в браузер не приходят вовсе.
 */
export function SmoothScroll() {
  const scrollLocked = useUiStore((s) => s.scrollLocked);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let stop: (() => void) | null = null;
    let loading = false;

    const start = async () => {
      if (lenis || loading) return;
      loading = true;
      const [{ default: LenisCtor }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      loading = false;
      if (!mq.matches) return;
      gsap.registerPlugin(ScrollTrigger);
      const instance = new LenisCtor({ lerp: 0.11, anchors: { offset: -80 } });
      instance.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      lenis = instance;
      if (useUiStore.getState().scrollLocked) instance.stop();
      stop = () => {
        gsap.ticker.remove(tick);
        instance.destroy();
        lenis = null;
        stop = null;
      };
    };
    const sync = () => (mq.matches ? void start() : stop?.());

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      stop?.();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = scrollLocked ? "hidden" : "";
    if (scrollLocked) lenis?.stop();
    else lenis?.start();
  }, [scrollLocked]);

  return null;
}
