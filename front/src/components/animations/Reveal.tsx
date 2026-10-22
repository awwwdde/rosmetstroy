"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { type ElementType, type ReactNode, useRef } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  children: ReactNode;
  as?: Extract<ElementType, "div" | "section" | "li" | "article" | "header">;
  className?: string;
  delay?: number;
  id?: string;
};

/**
 * Появление блока при прокрутке (как data-reveal в дизайне: opacity 0→1, сдвиг 28px, .9s).
 * Блоки, видимые сразу после загрузки, не анимируются — это исключает мигание первого экрана.
 * Контекст GSAP очищается при размонтировании, при prefers-reduced-motion анимация не создаётся.
 */
export function Reveal({ children, as: Tag = "div", className, delay = 0, id }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            delay,
            ease: "power3.out",
            clearProps: "transform",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  // Все допустимые теги — блочные элементы; тип div используется только для ref
  const Component = Tag as "div";
  return (
    <Component ref={ref} id={id} className={className}>
      {children}
    </Component>
  );
}
