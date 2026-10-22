"use client";

import { CheckCircle2, Inbox, Loader2, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type ComponentProps, type ReactNode, useEffect, useId } from "react";

import { useToasts } from "@/features/admin/toast-store";
import { cn } from "@/lib/utils";

/*
 * UI-кит админки. Визуальная система сайта (navy + фирменный синий, Onest),
 * но спокойнее: светлые поверхности, мягкие границы, понятные состояния.
 */

const ease = [0.2, 0.7, 0.2, 1] as const;

/* ---------- Кнопки ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";

const buttonVariants: Record<Variant, string> = {
  primary: "border-transparent bg-accent text-white shadow-[0_1px_2px_rgba(8,124,255,.3)] hover:bg-[#006de6]",
  dark: "border-transparent bg-navy-950 text-white hover:bg-navy-800",
  secondary: "border-[#d9e1ea] bg-white text-navy-950 hover:border-[#c3cfdc] hover:bg-[#f7f9fc]",
  ghost: "border-transparent bg-transparent text-muted hover:bg-[#eef3f8] hover:text-navy-950",
  danger: "border-danger-line bg-white text-danger hover:bg-danger-bg",
};

const buttonBase =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] border px-4 font-[inherit] text-sm font-medium whitespace-nowrap no-underline transition-[background-color,border-color,color,transform] duration-150 select-none active:scale-[.98] focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      className={cn(buttonBase, buttonVariants[variant], className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonBase,
        buttonVariants[variant],
        (variant === "primary" || variant === "dark") && "hover:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* ---------- Поля ---------- */

const control =
  "w-full rounded-[8px] border border-[#d9e1ea] bg-white px-3 text-[15px] text-navy-950 transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-placeholder hover:border-[#c3cfdc] focus:border-accent focus:ring-4 focus:ring-accent/12 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10 disabled:bg-paper";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input {...props} className={cn(control, "h-10", className)} />;
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} {...props} className={cn(control, "resize-y py-2.5 leading-normal", className)} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        control,
        "h-10 cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%234A5866%22%20stroke-width=%222.5%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-navy-950">{label}</span>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.span
            key="error"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-danger"
          >
            {error}
          </motion.span>
        ) : hint ? (
          <span key="hint" className="text-xs leading-normal text-muted">
            {hint}
          </span>
        ) : null}
      </AnimatePresence>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-3 text-sm text-navy-950 select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex h-[22px] w-[38px] flex-none items-center rounded-full p-[3px] transition-colors duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-accent/20",
          checked ? "justify-end bg-accent" : "justify-start bg-[#cfd8e3]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
          className="size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(7,29,54,.25)]"
        />
      </span>
      {label}
    </label>
  );
}

/* ---------- Раскладка ---------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-[26px] leading-tight font-semibold tracking-[-.025em] text-balance text-navy-950">
          {title}
        </h1>
        {description ? <p className="m-0 text-sm text-pretty text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const surface = "rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]";

export function Card({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn(surface, "flex flex-col gap-4 p-5", className)}>
      {title || actions ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {title ? <h2 className="m-0 text-[15px] font-semibold text-navy-950">{title}</h2> : null}
            {description ? <p className="m-0 text-[13px] text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ---------- Состояния загрузки ---------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-[8px] bg-[#e9eef4] after:absolute after:inset-0 after:-translate-x-full after:animate-[admin-shimmer_1.4s_ease-in-out_infinite] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent)]",
        className,
      )}
    />
  );
}

/** Заглушка списка/формы во время загрузки — повторяет форму будущего содержимого. */
export function Loading({ label = "Загрузка…", rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      <Skeleton className="h-8 w-56" />
      <div className={cn(surface, "flex flex-col gap-0 overflow-hidden")}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[#eef2f6] px-4 py-4 last:border-b-0">
            <Skeleton className="size-9 flex-none rounded-[8px]" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-[12px] border border-danger-line bg-danger-bg px-4 py-3 text-sm text-[#8a1f1f]"
    >
      <TriangleAlert className="size-4 flex-none" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="h-8">
          Повторить
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className={cn(surface, "flex flex-col items-center gap-3 px-6 py-14 text-center")}>
      <span className="flex size-12 items-center justify-center rounded-full bg-[#eef3f8] text-muted">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="m-0 text-[15px] font-medium text-navy-950">{title}</p>
      {text ? <p className="m-0 max-w-sm text-sm text-muted">{text}</p> : null}
      {action}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Сегментированный переключатель с анимированным индикатором. */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
  label: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <LayoutGroup id={id}>
      <div
        role="tablist"
        aria-label={label}
        className="flex max-w-full [scrollbar-width:none] gap-1 overflow-x-auto rounded-[10px] bg-[#e9eef4] p-1"
      >
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative flex h-8 flex-none cursor-pointer items-center gap-2 rounded-[7px] border-0 bg-transparent px-3 font-[inherit] text-[13px] font-medium transition-colors",
                active ? "text-navy-950" : "text-muted hover:text-navy-950",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="segment"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute inset-0 rounded-[7px] bg-white shadow-[0_1px_2px_rgba(7,29,54,.12)]"
                />
              ) : null}
              <span className="relative">{item.label}</span>
              {item.count !== undefined ? (
                <span className={cn("relative tabular-nums", active ? "text-accent" : "text-placeholder")}>
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Страницы" className="flex items-center justify-between gap-2 text-sm text-muted">
      <span className="tabular-nums">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} из {total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Назад
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Далее →
        </Button>
      </div>
    </nav>
  );
}

/* ---------- Модальное окно ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[16px] bg-white shadow-[0_24px_64px_-12px_rgba(7,29,54,.35)] sm:rounded-[16px]",
              wide ? "sm:max-w-5xl" : "sm:max-w-lg",
            )}
          >
            <div className="flex items-center justify-between border-b border-[#eef2f6] px-5 py-4">
              <h2 className="m-0 text-[17px] font-semibold text-navy-950">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-muted transition-colors hover:bg-[#eef3f8] hover:text-navy-950"
              >
                <X className="size-[18px]" />
              </button>
            </div>
            <div className="overflow-auto p-5" data-lenis-prevent>
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Удалить",
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="m-0 mb-6 text-sm leading-relaxed text-muted">{text}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------- Уведомления ---------- */

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="pointer-events-auto flex items-start gap-3 rounded-[12px] bg-navy-950 px-4 py-3 text-sm text-white shadow-[0_12px_32px_-8px_rgba(7,29,54,.45)]"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-px size-[18px] flex-none text-[#5fd08a]" aria-hidden="true" />
            ) : (
              <TriangleAlert className="mt-px size-[18px] flex-none text-[#ff8a80]" aria-hidden="true" />
            )}
            <span className="flex-1 leading-snug">{t.text}</span>
            <button
              type="button"
              aria-label="Скрыть"
              onClick={() => dismiss(t.id)}
              className="cursor-pointer border-0 bg-transparent p-0 text-white/50 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export { ease as adminEase };
