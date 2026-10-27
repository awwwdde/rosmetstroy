import type { Metadata } from "next";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { LegalDocument, legalMetadata } from "@/components/sections/LegalDocument";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("privacy", "Политика конфиденциальности");
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <LegalDocument slug="privacy" />
    </Suspense>
  );
}
