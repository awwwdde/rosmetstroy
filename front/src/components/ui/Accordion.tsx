"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type Item = { id: string | number; question: string; answer: string };

/** Аккордеон вопросов (дизайн: «+» поворачивается на 45°, ответ раскрывается). */
export function Accordion({ items, defaultOpen = 0 }: { items: Item[]; defaultOpen?: number }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const baseId = useId();

  return (
    <div className="flex flex-col border-b border-line">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-${index}`;
        return (
          <div key={item.id} className="border-t border-line">
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
                className="flex w-full cursor-pointer items-center justify-between gap-6 border-0 bg-transparent py-6 text-left font-[inherit] text-[19px] font-medium text-navy-950"
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 flex-none items-center justify-center rounded-[4px] border border-line text-accent transition-transform duration-300",
                    isOpen && "rotate-45",
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  id={panelId}
                  role="region"
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <p className="m-0 pr-14 pb-7 text-base leading-[1.65] whitespace-pre-line text-muted">
                    {item.answer}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
