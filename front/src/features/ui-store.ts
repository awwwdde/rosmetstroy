import { create } from "zustand";

type UiState = {
  /** Блокировка прокрутки страницы (мобильное меню, модальные окна) */
  scrollLocked: boolean;
  setScrollLocked: (locked: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  scrollLocked: false,
  setScrollLocked: (scrollLocked) => set({ scrollLocked }),
}));
