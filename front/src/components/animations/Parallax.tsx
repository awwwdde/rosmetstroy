"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ReactNode, useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { children: ReactNode; className?: string; distance?: number };

/**
 * Параллакс слоя относительно прокрутки секции (в дизайне — translateY(scrollY * 0.12)).
 * На мобильных и при prefers-reduced-motion слой неподвижен.
 */
export function Parallax({ children, className, distance = 120 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const section = el?.parentElement;
      if (!el || !section) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          y: distance,
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
