import type { Metadata } from "next";

import { AdminProviders } from "@/components/admin/AdminProviders";

export const metadata: Metadata = {
  title: { default: "Админ-панель", template: "%s — Админ-панель Росметстрой" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
