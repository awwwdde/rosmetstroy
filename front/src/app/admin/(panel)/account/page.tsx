"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Card, Field, Input, PageHeader } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { toast } from "@/features/admin/toast-store";

const schema = z
  .object({
    current_password: z.string().min(1, "Введите текущий пароль"),
    new_password: z.string().min(10, "Не короче 10 символов"),
    repeat: z.string(),
  })
  .refine((v) => v.new_password === v.repeat, { message: "Пароли не совпадают", path: ["repeat"] });
type Values = z.infer<typeof schema>;

export default function AccountPage() {
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", repeat: "" },
  });

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    try {
      await api.post("/auth/password", { current_password, new_password });
      reset();
      toast.success("Пароль изменён. Другие сессии завершены.");
    } catch (e) {
      toast.error(e);
    }
  });

  return (
    <>
      <PageHeader
        title="Учётная запись"
        description={user ? `${user.email} · ${user.role === "admin" ? "Администратор" : "Редактор"}` : undefined}
      />
      <Card title="Смена пароля" className="max-w-lg">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
          <Field label="Текущий пароль" error={formState.errors.current_password?.message}>
            <Input type="password" autoComplete="current-password" {...register("current_password")} />
          </Field>
          <Field label="Новый пароль" error={formState.errors.new_password?.message}>
            <Input type="password" autoComplete="new-password" {...register("new_password")} />
          </Field>
          <Field label="Повторите пароль" error={formState.errors.repeat?.message}>
            <Input type="password" autoComplete="new-password" {...register("repeat")} />
          </Field>
          <Button type="submit" loading={formState.isSubmitting} className="self-start">
            Изменить пароль
          </Button>
        </form>
      </Card>
    </>
  );
}
