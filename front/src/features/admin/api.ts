"use client";

/**
 * Клиент административного API. Авторизация — httpOnly cookie сессии,
 * для изменяющих запросов добавляется заголовок X-CSRF-Token (double submit cookie).
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const CSRF_COOKIE = "rms_csrf";

function csrfToken(): string {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : "";
}

type Detail = string | { msg: string; loc?: (string | number)[] }[];

function parseError(status: number, body: { detail?: Detail } | null): ApiError {
  const detail = body?.detail;
  if (typeof detail === "string") return new ApiError(detail, status);
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    for (const item of detail) {
      const key = (item.loc ?? []).filter((p) => p !== "body").join(".");
      fields[key] = item.msg.replace(/^Value error, /, "");
    }
    const first = detail[0];
    const where = first?.loc?.filter((p) => p !== "body").join(".");
    return new ApiError(
      first ? `${where ? `${where}: ` : ""}${fields[where ?? ""] ?? first.msg}` : "Ошибка проверки данных",
      status,
      fields,
    );
  }
  if (status === 401) return new ApiError("Сессия истекла. Войдите снова.", status);
  if (status === 403) return new ApiError("Недостаточно прав", status);
  if (status === 413) return new ApiError("Файл слишком большой", status);
  return new ApiError("Сервер недоступен", status);
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken();

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: payload,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Нет соединения с сервером", 0);
  }
  if (response.status === 401 && !path.startsWith("/auth/login")) onUnauthorized?.();
  if (!response.ok) throw parseError(response.status, await response.json().catch(() => null));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
};

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}
