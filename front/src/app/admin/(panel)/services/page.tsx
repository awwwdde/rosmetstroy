"use client";

import { EntityList } from "@/components/admin/EntityList";
import { Badge } from "@/components/admin/ui";
import type { ServiceCard } from "@/features/admin/types";

export default function ServicesList() {
  return (
    <EntityList<ServiceCard>
      title="Услуги"
      description="Направления, детальные страницы услуг и пункты меню «Услуги»"
      endpoint="/admin/services"
      basePath="/admin/services"
      createLabel="Добавить услугу"
      meta={(s) => (
        <>
          <span className="w-40 text-muted">{s.menu_group || "—"}</span>
          <span className="w-12 text-right text-muted">#{s.sort_order}</span>
          {s.is_partner ? <Badge className="bg-sky/40 text-navy-950">Партнёр</Badge> : null}
        </>
      )}
    />
  );
}
