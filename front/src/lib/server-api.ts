import "server-only";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

export class ApiUnavailableError extends Error {}

/**
 * GET-запрос к FastAPI из серверных компонентов.
 * Возвращает null для 404 и выбрасывает ApiUnavailableError, если API недоступен.
 */
export async function apiGet<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}/api/v1${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    throw new ApiUnavailableError(`API недоступен: ${path}`, { cause: error });
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiUnavailableError(`API ответил ${response.status}: ${path}`);
  return (await response.json()) as T;
}

/** GET-запрос, возвращающий текст (служебные файлы вроде ключа IndexNow). */
export async function apiText(path: string): Promise<string> {
  const response = await fetch(`${API_INTERNAL_URL}/api/v1${path}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new ApiUnavailableError(`API ответил ${response.status}: ${path}`);
  return response.text();
}
