"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

const fmt = new Intl.NumberFormat("ru-RU");

/** Плавный счётчик для показателей дашборда (без анимации при prefers-reduced-motion). */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt.format(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => {
        el.textContent = fmt.format(Math.round(v));
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={className}>
      {fmt.format(0)}
    </span>
  );
}
