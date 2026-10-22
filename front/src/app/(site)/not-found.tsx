import type { Metadata } from "next";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { NotFoundContent } from "@/components/sections/NotFoundContent";

export const metadata: Metadata = { title: "Страница не найдена", robots: { index: false } };

export default function SiteNotFound() {
  return (
    <Suspense fallback={<PageFallback tone="dark" />}>
      <NotFoundContent />
    </Suspense>
  );
}
