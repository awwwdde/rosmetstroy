"use client";

import "@/features/admin/zod-config";
import { Suspense } from "react";

import { AuthProvider } from "@/features/admin/auth";

import { Loading, Toaster } from "./ui";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <Suspense fallback={<Loading />}>
        <AuthProvider>{children}</AuthProvider>
      </Suspense>
      <Toaster />
    </div>
  );
}
