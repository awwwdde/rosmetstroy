"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Motion в «ленивом» режиме: компоненты m.* лёгкие, а движок анимаций догружается после первой
 * отрисовки — он не мешает загрузке страницы. strict — защита от случайного motion.* внутри.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
