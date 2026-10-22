import type { Metadata } from "next";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { NotFoundContent } from "@/components/sections/NotFoundContent";

export const metadata: Metadata = { title: "Страница не найдена", robots: { index: false } };

/** 404 для адресов вне известных маршрутов — с шапкой и подвалом сайта. */
export default function GlobalNotFound() {
  return (
    <SiteChrome>
      <Suspense fallback={<PageFallback tone="dark" />}>
        <NotFoundContent />
      </Suspense>
    </SiteChrome>
  );
}
