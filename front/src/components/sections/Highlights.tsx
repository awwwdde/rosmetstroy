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
      <Reveal className="container-site grid grid-cols-2 gap-x-6 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:gap-x-0">
        {list.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-2 border-line py-7 max-lg:nth-[n+3]:border-t lg:border-r lg:px-6 lg:py-10 lg:first:pl-0 lg:last:border-r-0"
          >
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
