"use client";

import { ChevronRight, ChevronsLeft, ExternalLink, KeyRound, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BrandMark } from "@/components/layout/Logo";
import { api } from "@/features/admin/api";
import { useAuth } from "@/features/admin/auth";
import { CREATE_ACTIONS, NAV_GROUPS, type NavItem, findNavItem } from "@/features/admin/navigation";
import type { LeadListItem, Paginated } from "@/features/admin/types";
import { cn } from "@/lib/utils";

import { CommandPalette } from "./CommandPalette";
import { Loading } from "./ui";

const COLLAPSE_KEY = "rms-admin-sidebar";

/*
 * Свёрнутое меню — удобство конкретного пользователя, хранится в браузере.
 * useSyncExternalStore отдаёт серверное значение при гидратации, затем сохранённое.
 */
let collapsedMemory: boolean | null = null;
const collapsedListeners = new Set<() => void>();

function readCollapsed(): boolean {
  if (collapsedMemory === null) {
    try {
      collapsedMemory = localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      collapsedMemory = false;
    }
  }
  return collapsedMemory;
}

function writeCollapsed(value: boolean) {
  collapsedMemory = value;
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    /* без сохранения между визитами */
  }
  collapsedListeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => collapsedListeners.delete(listener);
}

/** Число новых заявок для бейджа в меню; обновляется раз в минуту и при смене раздела. */
function useNewLeads(pathname: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get<Paginated<LeadListItem>>("/admin/leads?status=new&page_size=1")
        .then((r) => alive && setCount(r.total))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [pathname]);
  return count;
}

function initials(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function NavLink({
  item,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm no-underline transition-colors",
        active ? "text-white hover:text-white" : "text-white/60 hover:bg-white/[.04] hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <motion.span
          layoutId="nav-active"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }}
          className="absolute inset-0 rounded-[10px] bg-white/[.08] shadow-[inset_0_0_0_1px_rgba(169,212,255,.08)]"
        >
          <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-accent" />
        </motion.span>
      ) : null}
      <Icon
        className={cn("relative size-[18px] flex-none transition-colors", active ? "text-sky" : "")}
        aria-hidden="true"
      />
      {!collapsed ? <span className="relative flex-1 truncate">{item.label}</span> : null}
      {badge ? (
        <span
          className={cn(
            "relative flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white tabular-nums",
            collapsed && "absolute top-1 right-1 h-4 min-w-4 px-1 text-[10px]",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;
  const name = user.full_name || user.email;

  return (
    <div ref={ref} className="relative">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full left-0 z-10 mb-2 w-60 rounded-[12px] border border-white/10 bg-[#0c2a4b] p-1.5 shadow-[0_16px_40px_-8px_rgba(0,0,0,.5)]"
          >
            <div className="px-3 pt-2 pb-2.5">
              <div className="truncate text-sm font-medium text-white">{name}</div>
              <div className="truncate text-xs text-white/50">{user.email}</div>
            </div>
            {[
              { href: "/admin/account", label: "Учётная запись", icon: KeyRound },
              { href: "/", label: "Открыть сайт", icon: ExternalLink, external: true },
            ].map(({ href, label, icon: Icon, external }) => (
              <Link
                key={href}
                href={href}
                target={external ? "_blank" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-white/80 no-underline hover:bg-white/[.06] hover:text-white"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] border-0 bg-transparent px-3 py-2 text-left font-[inherit] text-sm text-[#ff9b93] hover:bg-white/[.06]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Выйти
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent p-2 text-left font-[inherit] transition-colors hover:bg-white/[.05]",
          collapsed && "justify-center",
        )}
      >
        <span className="flex size-8 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#087cff,#3fa0ff)] text-xs font-semibold text-white">
          {initials(name)}
        </span>
        {!collapsed ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-white">{name}</span>
            <span className="text-xs text-white/45">{user.role === "admin" ? "Администратор" : "Редактор"}</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const newLeads = useNewLeads(pathname);
  const current = findNavItem(pathname);

  return (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      <div className={cn("flex h-16 items-center gap-3 px-4", collapsed && "justify-center px-0")}>
        <Link
          href="/admin"
          onClick={onNavigate}
          aria-label="Обзор"
          className="flex min-w-0 items-center gap-2.5 no-underline"
        >
          <BrandMark className="h-[22px]" />
          {!collapsed ? (
            <span className="flex min-w-0 flex-col">
              {/* eslint-disable-next-line @next/next/no-img-element -- векторная надпись из брендбука */}
              <img src="/brand/wordmark-white.svg" alt="Росметстрой" className="h-3 w-auto self-start" />
              <span className="mt-1 text-[11px] leading-none text-white/45">Панель управления</span>
            </span>
          ) : null}
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Закрыть меню"
            className="ml-auto flex size-9 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-white/[.06] text-white"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <LayoutGroup id="admin-nav">
        <nav aria-label="Разделы админки" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div key={group.title} className="flex flex-col gap-0.5">
                {collapsed ? (
                  <span className="mx-auto mb-1 h-px w-6 bg-white/10" aria-hidden="true" />
                ) : (
                  <span className="px-3 pb-1.5 text-[11px] font-medium tracking-[.04em] text-white/35">
                    {group.title}
                  </span>
                )}
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={current?.item.href === item.href}
                    collapsed={collapsed}
                    badge={item.href === "/admin/leads" ? newLeads : undefined}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            );
          })}
        </nav>
      </LayoutGroup>

      <div className="flex flex-col gap-1 border-t border-white/[.07] p-3">
        <UserMenu collapsed={collapsed} />
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 font-[inherit] text-[13px] text-white/45 transition-colors hover:bg-white/[.04] hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronsLeft
              className={cn("size-4 transition-transform duration-300", collapsed && "rotate-180")}
              aria-hidden="true"
            />
            {!collapsed ? "Свернуть" : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CreateMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border-0 bg-navy-950 px-3 font-[inherit] text-sm font-medium text-white transition-colors hover:bg-navy-800"
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Создать</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-40 mt-2 w-56 rounded-[12px] border border-[#e3e9f0] bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(7,29,54,.3)]"
          >
            {CREATE_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm text-navy-950 no-underline hover:bg-[#f1f5f9] hover:text-navy-950"
              >
                <Icon className="size-4 text-muted" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  // Оболочка и содержимое раздела рендерятся сразу: без cookie сессии proxy.ts перенаправляет на вход,
  // а при истёкшей сессии первый запрос к API (401) отправит на страницу входа.
  const { isAdmin } = useAuth();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggleCollapsed = useCallback(() => writeCollapsed(!readCollapsed()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = findNavItem(pathname);
  const isDetail = current && pathname !== current.item.href;

  return (
    <div className="flex min-h-dvh bg-[#f4f7fa]">
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-none overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] lg:block",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40 }}
            >
              <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#e3e9f0] bg-[#f4f7fa]/85 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            aria-label="Открыть меню"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-[8px] border border-[#d9e1ea] bg-white text-navy-950 lg:hidden"
          >
            <Menu className="size-[18px]" />
          </button>

          <nav aria-label="Путь" className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-muted sm:inline">{current?.group.title ?? "Админка"}</span>
            <ChevronRight className="hidden size-3.5 flex-none text-placeholder sm:block" aria-hidden="true" />
            {isDetail ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push(current.item.href)}
                  className="cursor-pointer truncate border-0 bg-transparent p-0 font-[inherit] text-muted hover:text-navy-950"
                >
                  {current.item.label}
                </button>
                <ChevronRight className="size-3.5 flex-none text-placeholder" aria-hidden="true" />
                <span className="truncate font-medium text-navy-950">
                  {pathname.endsWith("/new") ? "Создание" : "Редактирование"}
                </span>
              </>
            ) : (
              <span className="truncate font-medium text-navy-950">{current?.item.label ?? "Учётная запись"}</span>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-[#d9e1ea] bg-white px-3 font-[inherit] text-sm text-muted transition-colors hover:border-[#c3cfdc] hover:text-navy-950"
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">Поиск и команды</span>
              <kbd className="hidden rounded-[5px] bg-[#f1f5f9] px-1.5 py-0.5 text-[11px] text-muted md:inline">
                Ctrl K
              </kbd>
            </button>
            <CreateMenu />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-8 lg:px-8">
          <Suspense fallback={<Loading />}>
            {/* Появление раздела — CSS-анимация: содержимое видно, даже если JS-анимации приостановлены */}
            <div key={pathname} className="flex animate-[admin-enter_.28s_cubic-bezier(.2,.7,.2,1)] flex-col gap-6">
              {children}
            </div>
          </Suspense>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} isAdmin={isAdmin} />
    </div>
  );
}
