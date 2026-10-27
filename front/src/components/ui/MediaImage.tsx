import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  objectPosition?: string;
};

/**
 * Изображение, заполняющее родителя (родитель задаёт размер и overflow).
 * Пока фотография не загружена в CMS, показывается фирменный градиент
 * (описание кадра доступно скринридерам через aria-label).
 */
export function MediaImage({ src, alt, sizes, priority, className, objectPosition }: Props) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#103d70_0%,#0a2747_100%)]",
          className,
        )}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      // Next 16: priority устарел; для LCP-изображения — высокий приоритет и загрузка без задержки
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : undefined}
      className={cn("object-cover", className)}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );
}
