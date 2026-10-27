/**
 * Выбор посетителя в уведомлении о cookie. Хранится в localStorage этого браузера:
 * «all» — можно подключать аналитику, «necessary» — только необходимое для работы сайта.
 */
export type CookieChoice = "all" | "necessary";

const KEY = "rms-cookie-consent";
const EVENT = "rms-cookie-consent";

export function readChoice(): CookieChoice | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "all" || value === "necessary" ? value : null;
  } catch {
    return null;
  }
}

export function saveChoice(choice: CookieChoice | null): void {
  try {
    if (choice) window.localStorage.setItem(KEY, choice);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Хранилище недоступно (приватный режим): выбор действует до перезагрузки страницы
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Значение на сервере: выбор неизвестен — баннер решает, показываться ли, уже в браузере. */
export const SERVER_CHOICE = "unknown" as const;
