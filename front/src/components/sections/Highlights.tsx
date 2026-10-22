import { Reveal } from "@/components/animations/Reveal";

type Props = { items?: { value: string; label: string }[] };

/**
 * Подтверждённые показатели из «Настроек сайта».
 * Пока заказчик их не подтвердил, список пуст и блок не выводится.
 */
export function Highlights({ items }: Props) {
  const list = (items ?? []).filter((i) => i.value && i.label);
  if (!list.length) return null;
  return (
    <section aria-label="Показатели" className="border-y border-line bg-white">
      <Reveal className="container-site grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
        {list.map((item) => (
          <div key={item.label} className="flex flex-col gap-2 border-r border-line px-6 py-10 first:pl-0">
            <span className="text-[clamp(36px,4vw,56px)] leading-none font-semibold tracking-[-.03em] text-navy-950">
              {item.value}
            </span>
            <span className="text-[15px] leading-snug text-muted">{item.label}</span>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
