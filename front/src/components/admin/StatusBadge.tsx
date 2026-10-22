import { leadStatus } from "@/features/admin/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const st = leadStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        st.tone,
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: st.color }} />
      {st.label}
    </span>
  );
}

const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

/** «5 минут назад», «вчера», затем дата. */
export function relativeTime(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "только что";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), "day");
  return dateFmt.format(new Date(iso));
}
