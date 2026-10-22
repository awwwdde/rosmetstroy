"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, Field, Input } from "@/components/admin/ui";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import type { Me } from "@/features/admin/types";

const schema = z.object({
  email: z.email("Введите e-mail"),
  password: z.string().min(1, "Введите пароль"),
});
type Values = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next");
  const target = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (user) router.replace(target);
  }, [user, router, target]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api.post<Me>("/auth/login", values);
      await refresh();
      router.replace(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
    }
  });

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Фирменная панель: знак «собирается» из трёх элементов */}
      <aside className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#0a2747_0%,#071d36_60%)] p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-accent/20 blur-[120px]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- векторная надпись из брендбука */}
        <img src="/brand/wordmark-white.svg" alt="Росметстрой" className="relative h-4 w-auto self-start" />
        <svg viewBox="12 2 182 110" aria-hidden="true" className="relative my-auto w-[min(340px,70%)]">
          {[
            { points: "12,112 12,76 86,2 86,38", fill: "#FFFFFF" },
            { points: "78,112 78,82 145,15 145,45", fill: "#0077FF" },
            { points: "140,112 140,88 194,34 194,58", fill: "#3FA0FF" },
          ].map((bar, i) => (
            <polygon
              key={bar.points}
              points={bar.points}
              fill={bar.fill}
              className="animate-[brand-bar_.8s_cubic-bezier(.2,.7,.2,1)_both]"
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            />
          ))}
        </svg>
        <div className="relative flex animate-[admin-enter_.6s_cubic-bezier(.2,.7,.2,1)_.5s_both] flex-col gap-2">
          <p className="m-0 text-[28px] leading-tight font-semibold tracking-[-.02em]">Панель управления сайтом</p>
          <p className="m-0 max-w-sm text-[15px] leading-relaxed text-white/60">
            Заявки, услуги, проекты, статьи и настройки — в одном месте.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center bg-[#f4f7fa] p-6 lg:bg-white">
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex w-full max-w-[380px] animate-[admin-enter_.5s_cubic-bezier(.2,.7,.2,1)_both] flex-col gap-5 rounded-[16px] bg-white p-8 shadow-[0_12px_40px_-16px_rgba(7,29,54,.25)] lg:p-0 lg:shadow-none"
        >
          <div className="flex flex-col gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- векторный логотип из брендбука */}
            <img src="/brand/logo-navy.svg" alt="Росметстрой" className="h-9 w-auto self-start lg:hidden" />
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-[26px] font-semibold tracking-[-.025em] text-navy-950">Вход</h1>
              <p className="m-0 text-sm text-muted">Используйте учётную запись сотрудника.</p>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {error ? (
              <motion.div
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-[10px] border border-danger-line bg-danger-bg px-3.5 py-3 text-sm text-[#8a1f1f]">
                  {error}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <Field label="E-mail" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="username"
              autoFocus
              aria-invalid={!!errors.email}
              className="h-11"
              {...register("email")}
            />
          </Field>
          <Field label="Пароль" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              className="h-11"
              {...register("password")}
            />
          </Field>
          <Button type="submit" loading={isSubmitting} className="mt-1 h-11">
            Войти
          </Button>
        </form>
      </div>
    </div>
  );
}
