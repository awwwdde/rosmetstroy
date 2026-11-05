import type { User } from "@/features/admin/types";

/** Аватар учётной записи: фото или инициалы на фирменном градиенте */
export function initials(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function Avatar({ user, size = 80 }: { user: User; size?: number }) {
  const name = user.full_name || user.email;
  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- аватар уже уменьшен на сервере до 256×256
      <img
        src={user.avatar_url}
        alt=""
        width={size}
        height={size}
        className="flex-none rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#087cff,#3fa0ff)] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
