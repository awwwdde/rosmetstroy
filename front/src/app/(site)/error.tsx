"use client";

import { useEffect } from "react";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[80dvh] items-end bg-navy-950 pt-[150px] pb-[clamp(72px,9vw,130px)] text-white">
      <div className="container-site flex flex-col items-start gap-6">
        <span className="text-[13px] text-sky">Временный сбой</span>
        <h1 className="m-0 heading-2-sm">Не удалось загрузить страницу</h1>
        <p className="m-0 max-w-[560px] lead-text text-white/72">
          Сервис временно недоступен. Повторите попытку через минуту или свяжитесь с нами по телефону.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="h-12 cursor-pointer rounded-[4px] border-0 bg-white px-5 font-[inherit] font-semibold text-navy-950 hover:bg-accent hover:text-white"
        >
          Повторить
        </button>
      </div>
    </section>
  );
}
