import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/types/content";

/**
 * Ссылка на сайт партнёрской IT-студии. Открывается в новой вкладке; referrer не скрываем,
 * чтобы студия видела переходы с сайта партнёра.
 */
export function PartnerLink({
  partner,
  className,
  children,
}: {
  partner: SiteSettings["partner"];
  className?: string;
  children?: React.ReactNode;
}) {
  if (!partner?.url || !/^https?:\/\//.test(partner.url)) return null;
  return (
    <a href={partner.url} target="_blank" rel="noopener" className={cn("no-underline", className)}>
      {children ?? partner.name}
    </a>
  );
}

/** Значок «открывается на другом сайте». */
export function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={className}>
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3L7 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
