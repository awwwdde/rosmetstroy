"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setUnauthorizedHandler } from "./api";
import type { Me, User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const toLogin = useCallback(() => {
    if (!window.location.pathname.startsWith("/admin/login")) {
      router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [router]);

  const refresh = useCallback(
    () =>
      api
        .get<Me>("/auth/me")
        .then((me) => setUser(me.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false)),
    [],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setUser(null);
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      toLogin();
    });
    return () => setUnauthorizedHandler(null);
  }, [toLogin]);

  useEffect(() => {
    api
      .get<Me>("/auth/me")
      .then((me) => setUser(me.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Без сессии все разделы, кроме входа, недоступны
  const mustLogin = !loading && !user && !pathname.startsWith("/admin/login");
  useEffect(() => {
    if (mustLogin) toLogin();
  }, [mustLogin, toLogin]);

  const value = useMemo(
    () => ({ user, loading, refresh, logout, isAdmin: user?.role === "admin" }),
    [user, loading, refresh, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth вне AuthProvider");
  return ctx;
}
