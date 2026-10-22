"use client";

import { CornerDownLeft, ExternalLink, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { CREATE_ACTIONS, NAV_GROUPS, type NavItem } from "@/features/admin/navigation";
import { cn } from "@/lib/utils";

type Command = NavItem & { section: string; external?: boolean };

/** Палитра команд (Ctrl/⌘ + K): быстрый переход по разделам и создание записей. */
export function CommandPalette({ open, onClose, isAdmin }: { open: boolean; onClose: () => void; isAdmin: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(
    () => [
      ...NAV_GROUPS.flatMap((g) =>
        g.items.filter((i) => !i.adminOnly || isAdmin).map((i) => ({ ...i, section: "Перейти" })),
      ),
      ...CREATE_ACTIONS.map((i) => ({ ...i, section: "Создать" })),
      { href: "/", label: "Открыть сайт", icon: ExternalLink, section: "Сайт", external: true },
    ],
    [isAdmin],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Сброс при открытии и смене запроса
  const [lastKey, setLastKey] = useState("");
  const key = `${open}|${query}`;
  if (key !== lastKey) {
    setLastKey(key);
    setActive(0);
    if (!open && query) setQuery("");
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    if (command.external) window.open(command.href, "_blank", "noopener");
    else router.push(command.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  let lastSection = "";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-start justify-center bg-navy-950/40 px-4 pt-[12vh] backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Поиск и команды"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 520, damping: 36 }}
            className="w-full max-w-[560px] overflow-hidden rounded-[16px] bg-white shadow-[0_24px_64px_-12px_rgba(7,29,54,.4)]"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-[#eef2f6] px-4">
              <Search className="size-[18px] flex-none text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Куда перейти или что создать?"
                aria-label="Поиск"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
                aria-activedescendant={results[active] ? `command-${active}` : undefined}
                className="h-14 flex-1 border-0 bg-transparent text-[15px] text-navy-950 outline-none placeholder:text-placeholder"
              />
              <kbd className="rounded-[6px] border border-[#e3e9f0] px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>
            <ul
              id="command-list"
              role="listbox"
              className="m-0 max-h-[360px] list-none overflow-auto p-2"
              data-lenis-prevent
            >
              {results.length ? (
                results.map((command, index) => {
                  const showSection = command.section !== lastSection;
                  lastSection = command.section;
                  const Icon = command.icon;
                  const selected = index === active;
                  return (
                    <li key={`${command.section}-${command.href}`} role="presentation">
                      {showSection ? (
                        <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium tracking-[.04em] text-placeholder">
                          {command.section}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        id={`command-${index}`}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(index)}
                        onClick={() => run(command)}
                        className={cn(
                          "relative flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left font-[inherit] text-sm text-navy-950",
                        )}
                      >
                        {selected ? (
                          <motion.span
                            layoutId="command-active"
                            transition={{ type: "spring", stiffness: 600, damping: 40 }}
                            className="absolute inset-0 rounded-[10px] bg-[#eef4ff]"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "relative flex size-8 flex-none items-center justify-center rounded-[8px] transition-colors",
                            selected ? "bg-accent text-white" : "bg-[#f1f5f9] text-muted",
                          )}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="relative flex-1">{command.label}</span>
                        {selected ? (
                          <CornerDownLeft className="relative size-4 text-accent" aria-hidden="true" />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-10 text-center text-sm text-muted">Ничего не найдено</li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
