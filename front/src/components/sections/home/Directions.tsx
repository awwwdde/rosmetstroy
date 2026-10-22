import { Reveal } from "@/components/animations/Reveal";
import { MediaImage } from "@/components/ui/MediaImage";
import { SmartLink } from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";
import type { HomeSections } from "@/types/content";

import { SectionIntro } from "../SectionIntro";

// Первое направление — основное: на широких экранах занимает 7 из 12 колонок и три ряда
const LAYOUT = ["min-[900px]:col-span-7 min-[900px]:row-span-3", "min-[900px]:col-span-5"];

export function Directions({ data }: { data: HomeSections["directions"] }) {
  return (
    <section id="directions" aria-labelledby="directions-title" className="scroll-mt-20 bg-paper section-y">
      <div className="container-site flex flex-col gap-14">
        <SectionIntro id="directions-title" title={data.title} text={data.text} />
        <div className="grid auto-rows-[320px] grid-cols-1 gap-4 min-[900px]:auto-rows-[clamp(200px,15vw,236px)] min-[900px]:grid-cols-12">
          {data.items.map((item, index) => {
            const main = index === 0;
            return (
              <Reveal key={item.title} className={cn("relative", main ? LAYOUT[0] : LAYOUT[1])}>
                <SmartLink
                  href={item.href}
                  className="group absolute inset-0 block overflow-hidden rounded-[6px] bg-navy-800 text-white no-underline hover:text-white"
                >
                  <div className="absolute inset-0 transition-transform duration-[1200ms] ease-out-soft group-hover:scale-[1.04]">
                    <MediaImage
                      src={item.image}
                      alt={item.image_alt}
                      sizes={main ? "(min-width: 900px) 58vw, 100vw" : "(min-width: 900px) 42vw, 100vw"}
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,29,54,0)_40%,rgba(7,29,54,.88)_100%)]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-[clamp(24px,2.6vw,36px)]">
                    <div className="flex flex-col gap-2">
                      {main ? <span className="text-[13px] text-sky">Основное направление</span> : null}
                      <h3
                        className={cn(
                          "m-0 leading-[1.1] font-semibold tracking-[-.02em] text-balance",
                          main
                            ? "max-w-[520px] text-[clamp(30px,3vw,44px)]"
                            : "max-w-[420px] text-[clamp(22px,1.8vw,26px)]",
                        )}
                      >
                        {item.title}
                      </h3>
                      <span
                        className={cn("leading-[1.45] text-white/75", main ? "max-w-[520px] text-base" : "text-[15px]")}
                      >
                        {item.text}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex size-12 flex-none items-center justify-center rounded-[4px] border border-white/40 transition-colors duration-200 group-hover:border-accent group-hover:bg-accent"
                    >
                      →
                    </span>
                  </div>
                </SmartLink>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
