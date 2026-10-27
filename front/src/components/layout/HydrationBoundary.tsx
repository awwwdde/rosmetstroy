import { type ReactNode, Suspense } from "react";

/**
 * Отдельная граница гидратации для секции ниже первого экрана. Содержимое уже отрисовано сервером,
 * но React «оживляет» каждую границу отдельной задачей и между ними отдаёт поток браузеру:
 * вместо одной длинной задачи на всю страницу — несколько коротких, первый экран (в том числе
 * фото) отрисовывается раньше.
 */
export function HydrationBoundary({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
