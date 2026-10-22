"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "./api";

type State<T> = { key: string | null; data: T | null; error: string | null };

/** Загрузка данных админки с состояниями loading/error и ручным обновлением. */
export function useResource<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const requestKey = path === null ? null : `${path}#${version}`;

  useEffect(() => {
    if (path === null || requestKey === null) return;
    let cancelled = false;
    api
      .get<T>(path)
      .then((data) => {
        if (!cancelled) setState({ key: requestKey, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState((s) => ({
            key: requestKey,
            data: s.data,
            error: e instanceof Error ? e.message : "Ошибка загрузки",
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), []);

  return {
    data: state.data,
    setData,
    error: state.error,
    loading: requestKey !== null && state.key !== requestKey,
    reload,
  };
}
