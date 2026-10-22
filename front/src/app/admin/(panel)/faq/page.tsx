"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Loading,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { api, qs } from "@/features/admin/api";
import { toast } from "@/features/admin/toast-store";
import type { Faq, Paginated, ServiceCard } from "@/features/admin/types";
import { useResource } from "@/features/admin/use-resource";

const schema = z.object({
  question: z.string().trim().min(1, "Введите вопрос").max(500),
  answer: z.string().trim().min(1, "Введите ответ").max(5000),
  sort_order: z.number().int(),
  is_published: z.boolean(),
  service_id: z.number().nullable(),
});
type Values = z.infer<typeof schema>;

function FaqForm({
  initial,
  services,
  onSaved,
}: {
  initial: Faq | null;
  services: ServiceCard[];
  onSaved: () => void;
}) {
  const { register, control, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { question: "", answer: "", sort_order: 10, is_published: true, service_id: null },
  });
  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = { ...values, locale: "ru" };
      if (initial) await api.put(`/admin/faq/${initial.id}`, payload);
      else await api.post("/admin/faq", payload);
      toast.success("Вопрос сохранён");
      onSaved();
    } catch (e) {
      toast.error(e);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Вопрос" error={formState.errors.question?.message}>
        <Input {...register("question")} />
      </Field>
      <Field label="Ответ" error={formState.errors.answer?.message}>
        <Textarea rows={6} {...register("answer")} />
      </Field>
      <Controller
        control={control}
        name="service_id"
        render={({ field }) => (
          <Field label="Где показывать" hint="Вопросы услуги выводятся на её странице и в разделе FAQ">
            <Select
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Общие вопросы</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  Услуга: {s.title}
                </option>
              ))}
            </Select>
          </Field>
        )}
      />
      <Field label="Порядок">
        <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
      </Field>
      <Controller
        control={control}
        name="is_published"
        render={({ field }) => <Toggle label="Опубликован" checked={field.value} onChange={field.onChange} />}
      />
      <Button type="submit" loading={formState.isSubmitting} className="self-end">
        Сохранить
      </Button>
    </form>
  );
}

export default function FaqAdminPage() {
  const { data, error, loading, reload } = useResource<Faq[]>("/admin/faq?locale=ru");
  const services = useResource<Paginated<ServiceCard>>(`/admin/services${qs({ page_size: 100, locale: "ru" })}`);
  const [editing, setEditing] = useState<Faq | null | undefined>(undefined);
  const [removing, setRemoving] = useState<Faq | null>(null);
  const serviceTitle = new Map(services.data?.items.map((s) => [s.id, s.title]));

  const remove = async () => {
    if (!removing) return;
    try {
      await api.del(`/admin/faq/${removing.id}`);
      toast.success("Вопрос удалён");
      setRemoving(null);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Вопросы и ответы"
        description="Общие вопросы и вопросы на страницах услуг"
        actions={<Button onClick={() => setEditing(null)}>Добавить вопрос</Button>}
      />
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <EmptyState title="Вопросов пока нет." /> : null}
      {data?.length ? (
        <div className="overflow-hidden rounded-[12px] border border-[#e3e9f0] bg-white shadow-[0_1px_2px_rgba(7,29,54,.04)]">
          {data.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center gap-4 border-b border-mist px-4 py-3 text-sm last:border-b-0"
            >
              <span className="min-w-[240px] flex-1 font-medium text-navy-950">{f.question}</span>
              <span className="w-56 truncate text-muted">
                {f.service_id ? (serviceTitle.get(f.service_id) ?? "Услуга") : "Общий"}
              </span>
              {!f.is_published ? <Badge className="bg-mist text-muted">Скрыт</Badge> : null}
              <Button variant="secondary" onClick={() => setEditing(f)}>
                Изменить
              </Button>
              <Button variant="ghost" className="text-danger" onClick={() => setRemoving(f)}>
                Удалить
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={editing ? "Вопрос" : "Новый вопрос"}
      >
        {editing !== undefined ? (
          <FaqForm
            initial={editing}
            services={services.data?.items ?? []}
            onSaved={() => {
              setEditing(undefined);
              reload();
            }}
          />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Удалить вопрос?"
        text={removing?.question ?? ""}
        onConfirm={() => void remove()}
      />
    </>
  );
}
