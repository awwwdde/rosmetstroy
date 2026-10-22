"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button, PageHeader } from "./ui";

type Props = {
  title: string;
  backHref: string;
  publicHref?: string | null;
  saving: boolean;
  onDelete?: () => void;
  saveLabel?: string;
};

export function EditorHeader({ title, backHref, publicHref, saving, onDelete, saveLabel = "Сохранить" }: Props) {
  return (
    <PageHeader
      title={title}
      actions={
        <>
          <Link href={backHref} className="inline-flex h-10 items-center text-sm no-underline">
            ← К списку
          </Link>
          {publicHref ? (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-1.5 text-sm no-underline"
            >
              <ExternalLink className="size-4" aria-hidden="true" /> На сайте
            </a>
          ) : null}
          {onDelete ? (
            <Button variant="danger" onClick={onDelete}>
              Удалить
            </Button>
          ) : null}
          <Button type="submit" form="entity-form" loading={saving}>
            {saveLabel}
          </Button>
        </>
      }
    />
  );
}
