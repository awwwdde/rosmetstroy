"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchFormToken, type LeadPayload, LeadSubmitError, submitLead } from "./api";
import { MAX_FILES, fileProblem } from "./schema";

export type LeadFileItem = { id: string; file: File; problem: string | null };

export function useLeadFiles() {
  const [files, setFiles] = useState<LeadFileItem[]>([]);

  const add = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      problem: fileProblem(file),
    }));
    setFiles((current) => [...current, ...incoming].slice(0, MAX_FILES));
  }, []);

  const remove = useCallback((id: string) => setFiles((current) => current.filter((f) => f.id !== id)), []);
  const clear = useCallback(() => setFiles([]), []);
  const hasProblems = files.some((f) => f.problem);

  return { files, add, remove, clear, hasProblems };
}

const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/**
 * Перетаскивание файлов на зону вложений. Пока форма на странице, файл, брошенный мимо зоны,
 * не открывается браузером вместо сайта (иначе введённые данные пропадают).
 */
export function useFileDrop(add: (list: FileList | null) => void) {
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const guard = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  const zone = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // уход на вложенный элемент зоны — не уход из зоны
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      add(e.dataTransfer.files);
    },
  };

  return { dragOver, zone };
}

export type SubmitStatus ="form" | "loading" | "success" | "failed";

/** Отправка заявки: токен антиспам-фильтра запрашивается при открытии формы. */
export function useLeadSubmit() {
  const tokenRef = useRef<Promise<string> | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("form");
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState("");

  const prepare = useCallback(() => {
    tokenRef.current = fetchFormToken().catch((e: unknown) => {
      tokenRef.current = null;
      throw e;
    });
    tokenRef.current.catch(() => undefined);
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  const submit = useCallback(
    async (payload: LeadPayload, files: File[]) => {
      setStatus("loading");
      setError(null);
      try {
        if (!tokenRef.current) prepare();
        const token = await tokenRef.current!;
        const created = await submitLead(payload, files, token);
        setTicket(created.number);
        setStatus("success");
        prepare();
      } catch (e) {
        setError(e instanceof LeadSubmitError ? e.message : "Не удалось отправить заявку");
        setStatus("failed");
        if (e instanceof LeadSubmitError && e.status === 400) prepare();
      }
    },
    [prepare],
  );

  return { status, setStatus, error, ticket, submit };
}
