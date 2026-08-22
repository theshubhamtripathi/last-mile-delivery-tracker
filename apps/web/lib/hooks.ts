'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Runs an async loader on mount and exposes {data, loading, error, reload}. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : 'Failed to load'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Polls a loader on an interval; pauses when the tab is hidden. */
export function usePolling<T>(loader: () => Promise<T>, intervalMs: number, deps: unknown[] = []): AsyncState<T> {
  const state = useAsync(loader, deps);
  const reloadRef = useRef(state.reload);
  reloadRef.current = state.reload;
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) reloadRef.current();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return state;
}
