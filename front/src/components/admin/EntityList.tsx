"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";

import { qs } from "@/features/admin/api";
import type { Media, Paginated } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

import { MediaThumb } from "./MediaPicker";
import { EmptyState, ErrorState, Input, LinkButton, Loading, PageHeader, Pagination } from "./ui";

type Row = { id: number; title: string; cover?: Media | null };

type Props<T extends Row> = {
  title: string;
  description: string;
  endpoint: string;
  basePath: string;
  createLabel: string;
  extraQuery?: Record<string, string>;
  filters?: ReactNode;
  meta: (item: T) => ReactNode;
};

/** Типовой список сущностей CMS: поиск, пагинация, переход к редактору. */
export function EntityList<T extends Row>({
  title,
  description,
  endpoint,
  basePath,
  createLabel,
  extraQuery,
  filters,
  meta,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const { data, error, loading, reload } = useResource<Paginated<T>>(
    `${endpoint}${qs({ page, page_size: 30, q, locale: "ru", ...extraQuery })}`,
  );

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<LinkButton href={`${basePath}/new`}>{createLabel}</LinkButton>}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Поиск по названию"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        {filters}
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.items.length ? (
        <EmptyState
          title="Ничего не найдено."
          action={<LinkButton href={`${basePath}/new`}>{createLabel}</LinkButton>}
        />
      ) : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/${item.id}`}
              className="flex flex-wrap items-center gap-4 border-b border-mist px-4 py-3 text-sm text-navy-950 no-underline last:border-b-0 hover:bg-paper hover:text-navy-950"
            >
              {"cover" in item ? <MediaThumb media={item.cover ?? null} className="h-12 w-16 flex-none" /> : null}
              <span className="min-w-[200px] flex-1 font-medium">{item.title}</span>
              {meta(item)}
            </Link>
          ))}
        </div>
      ) : null}
      {data ? <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={setPage} /> : null}
    </>
  );
}
