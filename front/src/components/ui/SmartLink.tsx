import Link from "next/link";
import type { ComponentProps } from "react";

import { isExternal } from "@/lib/utils";

type Props = Omit<ComponentProps<"a">, "href"> & { href: string; prefetch?: boolean };

/** next/link для внутренних маршрутов, обычная ссылка для якорей, tel:, mailto: и внешних адресов. */
export function SmartLink({ href, prefetch, ...rest }: Props) {
  // Файлы медиатеки и API — не маршруты Next.js, для них нужен обычный переход
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/media/") || href.startsWith("/api/")) {
    const external = isExternal(href);
    return <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest} />;
  }
  return <Link href={href} prefetch={prefetch} {...rest} />;
}
