import type { Metadata } from "next";
import { Suspense } from "react";

import { PageFallback } from "@/components/layout/PageFallback";
import { LegalDocument, legalMetadata } from "@/components/sections/LegalDocument";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("consent", "Согласие на обработку персональных данных");
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <LegalDocument slug="consent" />
    </Suspense>
  );
}
