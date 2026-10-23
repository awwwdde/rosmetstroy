/*
 * Линейные пиктограммы задач — чертёжный язык фирменного каркаса, а не набор универсальных иконок.
 * Выбор по адресу услуги, на которую ведёт карточка: в CMS ничего настраивать не нужно.
 * При наведении на карточку линии перерисовываются (.pictogram в globals.css).
 */

type Kind =
  "frame" | "mezzanine" | "stairs" | "cutting" | "interior" | "delivery" | "drawing" | "assembly" | "embed" | "beam";

const RULES: [RegExp, Kind][] = [
  [/karkas|angar/, "frame"],
  [/antresol|mezonin|perekryt/, "mezzanine"],
  [/lestnic|ograzhd|naves|vorot|zabor/, "stairs"],
  [/metalloobrabot|rezk|plazm/, "cutting"],
  [/otdelk/, "interior"],
  [/logist|dostav/, "delivery"],
  [/proekt/, "drawing"],
  [/montazh/, "assembly"],
  [/zakladn/, "embed"],
];

export function pictogramFor(href?: string): Kind | null {
  if (!href) return null;
  return RULES.find(([re]) => re.test(href))?.[1] ?? "beam";
}

const PATHS: Record<Kind, string[]> = {
  // Рама с фермой
  frame: ["M6 42V20L24 9l18 11v22", "M6 20h36", "M12 20l6-7.5M18 20v-7.5L24 20l6-7.5V20l6-7.5", "M3 42h42"],
  // Здание с антресольным этажом
  mezzanine: ["M6 42V14h36v28", "M6 28h22v14", "M17 28v14", "M6 42l11-14M28 28l-11 14", "M3 42h42"],
  // Лестница с ограждением
  stairs: ["M6 42h8v-7h8v-7h8v-7h8v-7h4", "M10 30l26-20", "M14 27v-8M22 21v-8M30 15V7", "M3 42h42"],
  // Лист с контуром резки
  cutting: ["M6 34l10-24h26L32 34z", "M16 26l5-10h11l-5 10z", "M36 6l6 6", "M33 9l2-2"],
  // Помещение с перегородкой и потолком
  interior: ["M6 42V10h36v32", "M6 16h36", "M24 16v26", "M29 42V30h8v12", "M11 22h8v8h-8z", "M3 42h42"],
  // Грузовик с крупным агрегатом
  delivery: [
    "M4 34V16h24v18",
    "M28 22h9l6 7v5h-15",
    "M8 22h16v8H8z",
    "M4 34h39",
    "M13 38a3 3 0 1 0 0-.1M35 38a3 3 0 1 0 0-.1",
  ],
  // Лист чертежа с размерной линией
  drawing: ["M9 6h22l8 8v28H9z", "M31 6v8h8", "M15 30h18", "M15 27v6M33 27v6", "M15 20h12"],
  // Крюк крана над балкой
  assembly: ["M24 4v14", "M24 18a5 5 0 1 0 5 5", "M8 34h32", "M8 30v8M40 30v8", "M3 42h42"],
  // Закладная пластина с анкерами
  embed: ["M8 14h32v6H8z", "M14 20v18l-3 4M24 20v18M34 20v18l3 4", "M3 42h42"],
  // Двутавр в сечении
  beam: ["M10 8h28M10 40h28", "M24 8v32", "M10 8v4h28V8M10 40v-4h28v4"],
};

export function TaskPictogram({ kind }: { kind: Kind }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="pictogram text-navy-800"
    >
      {PATHS[kind].map((d) => (
        <path key={d} d={d} pathLength={1} />
      ))}
    </svg>
  );
}
