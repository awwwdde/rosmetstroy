import type { components } from "@/types/api";

type LeadCreated = components["schemas"]["LeadCreated"];

export type LeadPayload = {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  service_id?: number | null;
  service_label?: string;
  description?: string;
};

export class LeadSubmitError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type ErrorBody = { detail?: string | { msg: string; loc?: (string | number)[] }[] };

function errorMessage(body: ErrorBody | null, status: number): string {
  if (body?.detail) {
    if (typeof body.detail === "string") return body.detail;
    const first = body.detail[0];
    if (first) return first.msg.replace(/^Value error, /, "");
  }
  if (status === 413) return "Файлы слишком большие";
  if (status === 429) return "Слишком много заявок. Повторите попытку позже.";
  return "Сервер недоступен. Повторите попытку или позвоните нам.";
}

export async function fetchFormToken(): Promise<string> {
  const response = await fetch("/api/v1/leads/token", { cache: "no-store" });
  if (!response.ok) throw new LeadSubmitError("Не удалось подготовить форму", response.status);
  return ((await response.json()) as { token: string }).token;
}

export async function submitLead(payload: LeadPayload, files: File[], token: string): Promise<LeadCreated> {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== "") form.append(key, String(value));
  }
  form.append("form_token", token);
  form.append("website", "");
  form.append("source_page", window.location.pathname);
  for (const file of files) form.append("files", file, file.name);

  let response: Response;
  try {
    response = await fetch("/api/v1/leads", { method: "POST", body: form });
  } catch {
    throw new LeadSubmitError("Нет соединения с сервером. Проверьте интернет и повторите попытку.", 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new LeadSubmitError(errorMessage(body, response.status), response.status);
  }
  return (await response.json()) as LeadCreated;
}
