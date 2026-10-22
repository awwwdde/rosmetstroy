"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
} from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { toast } from "@/features/admin/toast-store";
import type { User } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const createSchema = z.object({
  email: z.email("Введите e-mail"),
  full_name: z.string().max(255),
  role: z.enum(["admin", "editor"]),
  password: z.string().min(10, "Не короче 10 символов"),
});
type CreateValues = z.infer<typeof createSchema>;

const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

function CreateUserForm({ onSaved }: { onSaved: () => void }) {
  const { register, handleSubmit, formState } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", full_name: "", role: "editor", password: "" },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post("/admin/users", values);
      toast.success("Пользователь создан");
      onSaved();
    } catch (e) {
      toast.error(e);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="E-mail" error={formState.errors.email?.message}>
        <Input type="email" autoComplete="off" {...register("email")} />
      </Field>
      <Field label="Имя">
        <Input {...register("full_name")} />
      </Field>
      <Field
        label="Роль"
        hint="Редактор управляет контентом и заявками; администратор — также настройками и пользователями"
      >
        <Select {...register("role")}>
          <option value="editor">Редактор</option>
          <option value="admin">Администратор</option>
        </Select>
      </Field>
      <Field label="Пароль" error={formState.errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Button type="submit" loading={formState.isSubmitting} className="self-end">
        Создать
      </Button>
    </form>
  );
}

export default function UsersPage() {
  const { isAdmin, user: me, loading: authLoading } = useAuth();
  const { data, error, loading, reload } = useResource<User[]>(isAdmin ? "/admin/users" : null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<User | null>(null);

  if (!isAdmin) return authLoading ? <Loading /> : <ErrorState message="Раздел доступен только администраторам." />;

  const update = async (user: User, patch: Partial<Pick<User, "role" | "is_active">>) => {
    try {
      await api.patch(`/admin/users/${user.id}`, patch);
      toast.success("Изменения сохранены");
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  const resetPassword = async (user: User) => {
    const password = window.prompt(`Новый пароль для ${user.email} (не короче 10 символов)`);
    if (!password) return;
    try {
      await api.patch(`/admin/users/${user.id}`, { password });
      toast.success("Пароль изменён, сессии пользователя завершены");
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async (user: User) => {
    try {
      await api.del(`/admin/users/${user.id}`);
      toast.success("Пользователь удалён");
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Пользователи"
        description="Доступ к админ-панели и роли"
        actions={<Button onClick={() => setCreating(true)}>Добавить пользователя</Button>}
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data ? (
        <div className="overflow-x-auto rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Пользователь</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Последний вход</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} className="border-b border-mist last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy-950">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => void update(u, { role: e.target.value })}
                      className="h-9 w-40"
                      aria-label="Роль"
                    >
                      <option value="editor">Редактор</option>
                      <option value="admin">Администратор</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.last_login_at ? date.format(new Date(u.last_login_at)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={u.is_active ? "bg-[#dff5e3] text-[#1d6b34]" : "bg-mist text-muted"}>
                      {u.is_active ? "Активен" : "Отключён"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" onClick={() => void resetPassword(u)}>
                      Сменить пароль
                    </Button>
                    {u.id !== me?.id ? (
                      <Button variant="ghost" onClick={() => void update(u, { is_active: !u.is_active })}>
                        {u.is_active ? "Отключить" : "Включить"}
                      </Button>
                    ) : null}
                    {u.id !== me?.id ? (
                      <Button variant="ghost" className="text-[#c0392b]" onClick={() => setRemoving(u)}>
                        Удалить
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Удалить пользователя?"
        text={`${removing?.email ?? ""} потеряет доступ к админ-панели. Его комментарии к заявкам останутся без автора. Если нужно лишь временно закрыть доступ — нажмите «Отключить».`}
        onConfirm={() => {
          if (removing) void remove(removing);
          setRemoving(null);
        }}
      />
      <Modal open={creating} onClose={() => setCreating(false)} title="Новый пользователь">
        {creating ? (
          <CreateUserForm
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}
