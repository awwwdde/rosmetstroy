import { create } from "zustand";

export type Toast = { id: number; tone: "success" | "error"; text: string };

type ToastState = {
  toasts: Toast[];
  push: (tone: Toast["tone"], text: string) => void;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (tone, text) => {
    const id = ++counter;
    set({ toasts: [...get().toasts, { id, tone, text }] });
    setTimeout(() => get().dismiss(id), tone === "error" ? 7000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (text: string) => useToasts.getState().push("success", text),
  error: (error: unknown) =>
    useToasts.getState().push("error", error instanceof Error ? error.message : "Неизвестная ошибка"),
};
