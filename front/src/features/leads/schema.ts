import { z } from "zod";

export const MAX_FILE_MB = 25;
export const MAX_FILES = 10;
export const ACCEPTED_EXTENSIONS = [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png", ".zip"];
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

const phone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[\d\s+()-]+$/.test(v), "Некорректный номер телефона")
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return v === "" || (digits >= 10 && digits <= 15);
  }, "Некорректный номер телефона");

const email = z.union([z.literal(""), z.email("Некорректный e-mail")]);

// Отдельное согласие на обработку ПД (152-ФЗ, ст. 9): галочка не стоит по умолчанию
const consent = z.boolean().refine((v) => v, "Без согласия на обработку персональных данных заявку отправить нельзя");

export const requestSchema = z
  .object({
    name: z.string().trim().min(1, "Укажите имя").max(255),
    company: z.string().trim().max(255),
    phone,
    email,
    description: z.string().trim().max(5000, "Не больше 5000 символов"),
    consent,
  })
  .refine((v) => v.phone !== "" || v.email !== "", {
    message: "Оставьте телефон или почту",
    path: ["phone"],
  });

export type RequestValues = z.infer<typeof requestSchema>;

export const quickSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(255),
  phone: phone.refine((v) => v !== "", "Укажите телефон"),
  description: z.string().trim().max(5000),
  consent,
});

export type QuickValues = z.infer<typeof quickSchema>;

export function fileProblem(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) return "НЕПОДДЕРЖИВАЕМЫЙ ФОРМАТ";
  if (file.size > MAX_FILE_MB * 1048576) return `БОЛЬШЕ ${MAX_FILE_MB} МБ`;
  return null;
}
