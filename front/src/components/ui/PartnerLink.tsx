import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/types/content";

/**
 * Ссылка на сайт студии — автора сайта (подвал). Открывается в новой вкладке; referrer не скрываем,
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
