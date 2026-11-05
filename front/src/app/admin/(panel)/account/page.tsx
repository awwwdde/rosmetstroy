"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Camera, Send, Trash2, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Avatar } from "@/components/admin/Avatar";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { toast } from "@/features/admin/toast-store";
import type { User } from "@/features/admin/types";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Введите текущий пароль"),
    new_password: z.string().min(10, "Не короче 10 символов"),
    repeat: z.string(),
  })
  .refine((v) => v.new_password === v.repeat, { message: "Пароли не совпадают", path: ["repeat"] });
type PasswordValues = z.infer<typeof passwordSchema>;

type TelegramStatus = {
  enabled: boolean;
  bot_username: string;
  bot_online: boolean;
  bot_error: string;
  linked: boolean;
  username: string;
  linked_at: string | null;
};

const date = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" });

function ProfileCard({ user, onSaved }: { user: User; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(user.full_name);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/auth/profile", { full_name: name.trim() });
      await onSaved();
      toast.success("Имя сохранено");
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    setUploading(true);
    try {
      await api.post("/auth/avatar", body);
      await onSaved();
      toast.success("Аватар обновлён");
    } catch (err) {
      toast.error(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    try {
      await api.del("/auth/avatar");
      await onSaved();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <Card title="Профиль" description="Имя и фото видны в панели и в уведомлениях бота о ваших действиях">
      <div className="flex items-center gap-4">
        <Avatar user={user} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" aria-hidden="true" />
            {user.avatar_url ? "Заменить фото" : "Загрузить фото"}
          </Button>
          {user.avatar_url ? (
            <Button variant="ghost" onClick={() => void removeAvatar()}>
              <Trash2 className="size-4" aria-hidden="true" />
              Удалить
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>
      </div>
      <p className="m-0 text-xs text-muted">JPEG, PNG, WebP или GIF до 5 МБ — обрежем до квадрата.</p>
      <form onSubmit={(e) => void saveName(e)} className="flex flex-col gap-3">
        <Field label="Имя">
          <Input value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" />
        </Field>
        <Field label="E-mail для входа">
          <Input value={user.email} disabled readOnly />
        </Field>
        <Button type="submit" loading={saving} disabled={name.trim() === user.full_name} className="self-start">
          Сохранить
        </Button>
      </form>
    </Card>
  );
}

function TelegramCard({ onLinked }: { onLinked: () => Promise<void> }) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [waitingUntil, setWaitingUntil] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get<TelegramStatus>("/auth/telegram").then(setStatus), []);

  useEffect(() => {
    load().catch(toast.error);
  }, [load]);

  // Пока пользователь нажимает «Старт» в боте — проверяем привязку
  useEffect(() => {
    if (!waitingUntil) return;
    const timer = window.setInterval(() => {
      if (Date.now() > waitingUntil) {
        setWaitingUntil(null);
        return;
      }
      api
        .get<TelegramStatus>("/auth/telegram")
        .then((s) => {
          setStatus(s);
          if (s.linked) {
            setWaitingUntil(null);
            toast.success("Telegram привязан");
            void onLinked();
          }
        })
        .catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [waitingUntil, onLinked]);

  const link = async () => {
    // Окно открываем сразу по клику, иначе браузер заблокирует всплывающее окно
    const popup = window.open("", "_blank");
    setBusy(true);
    try {
      const { url, expires_at } = await api.post<{ url: string; expires_at: string }>("/auth/telegram/link");
      if (popup) popup.location.href = url;
      else window.location.href = url;
      setWaitingUntil(new Date(expires_at).getTime());
    } catch (err) {
      popup?.close();
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    try {
      await api.del("/auth/telegram");
      await load();
      await onLinked();
      toast.success("Telegram отвязан");
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    try {
      await api.post("/auth/telegram/test");
      toast.success("Сообщение отправлено в Telegram");
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <Card
      title="Уведомления в Telegram"
      description="Новые заявки и действия других пользователей в панели — в личный чат с ботом"
      actions={status?.linked ? <Badge className="bg-[#e8f7ee] text-[#137a3f]">Подключено</Badge> : null}
    >
      {status?.enabled && !status.bot_online ? (
        <div className="rounded-[8px] border border-danger-line bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
          <b>Бот на сервере сейчас не получает сообщения</b> — «Старт» и привязка не сработают.
          {status.bot_error ? <div className="mt-1">{status.bot_error}</div> : null}
        </div>
      ) : null}
      {!status ? (
        <p className="m-0 text-sm text-muted">Загрузка…</p>
      ) : !status.enabled ? (
        <p className="m-0 text-sm text-muted">
          Бот не настроен на сервере. Администратору нужно задать <code>TELEGRAM_BOT_TOKEN</code>.
        </p>
      ) : status.linked ? (
        <>
          <p className="m-0 text-sm text-navy-950">
            Привязан {status.username ? <b>@{status.username}</b> : "Telegram"}
            {status.linked_at ? (
              <span className="text-muted"> · с {date.format(new Date(status.linked_at))}</span>
            ) : null}
          </p>
          <p className="m-0 text-[13px] text-muted">
            Кнопка «Войти в панель» под сообщениями бота открывает панель под этой учётной записью.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void test()}>
              <BellRing className="size-4" aria-hidden="true" />
              Тестовое сообщение
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void unlink()}>
              <Unlink className="size-4" aria-hidden="true" />
              Отвязать
            </Button>
          </div>
        </>
      ) : (
        <>
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm text-navy-950">
            <li>
              Нажмите «Привязать Telegram» — откроется чат с ботом
              {status.bot_username ? ` @${status.bot_username}` : ""}.
            </li>
            <li>Нажмите «Старт» в Telegram. Всё — привязка сохранится автоматически.</li>
          </ol>
          {waitingUntil ? (
            <p className="m-0 text-[13px] text-accent">Ждём нажатия «Старт» в боте… Ссылка действует 15 минут.</p>
          ) : null}
          <Button loading={busy} onClick={() => void link()} className="self-start">
            <Send className="size-4" aria-hidden="true" />
            {waitingUntil ? "Открыть бота ещё раз" : "Привязать Telegram"}
          </Button>
        </>
      )}
    </Card>
  );
}

function PasswordCard() {
  const { register, handleSubmit, reset, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
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
    <Card title="Смена пароля">
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
  );
}

export default function AccountPage() {
  const { user, refresh } = useAuth();

  return (
    <>
      <PageHeader
        title="Настройки учётной записи"
        description={user ? `${user.email} · ${user.role === "admin" ? "Администратор" : "Редактор"}` : undefined}
      />
      {user ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ProfileCard key={user.id} user={user} onSaved={refresh} />
          <div className="flex flex-col gap-4">
            <TelegramCard onLinked={refresh} />
            <PasswordCard />
          </div>
        </div>
      ) : null}
    </>
  );
}
