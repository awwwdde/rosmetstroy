import { cn } from "@/lib/utils";

/** Заглушка на время потоковой загрузки контента страницы — резервирует высоту, исключая сдвиг макета. */
export function PageFallback({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn("min-h-[100dvh]", tone === "dark" ? "bg-navy-900" : "bg-paper")}
    >
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
