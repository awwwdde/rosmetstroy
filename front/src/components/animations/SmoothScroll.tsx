"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";

import { useUiStore } from "@/features/ui-store";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/**
 * Плавная прокрутка Lenis — только на desktop с точным указателем
 * и без prefers-reduced-motion. Синхронизирована с ScrollTrigger через тикер GSAP.
 */
export function SmoothScroll() {
  const scrollLocked = useUiStore((s) => s.scrollLocked);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      lenis = new Lenis({ lerp: 0.11, anchors: { offset: -80 } });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };
    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
    const sync = () => (mq.matches ? (lenis ? null : start()) : stop());

    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      stop();
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = scrollLocked ? "hidden" : "";
    if (scrollLocked) lenis?.stop();
    else lenis?.start();
  }, [scrollLocked]);

  return null;
}
