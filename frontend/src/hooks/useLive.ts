import { useCallback, useEffect, useRef, useState } from "react";

export interface UseLiveOptions {
  /** Poll interval in milliseconds. Pass 0 to disable polling. */
  intervalMs?: number;
  /** Optional predicate: when it returns false the poller stops fetching. */
  active?: (data?: unknown) => boolean;
  /** Refetch immediately when the tracked query changes. */
  refreshKey?: string;
}

/**
 * Live data hook — a controlled-polling real-time abstraction. Fetches
 * immediately, then re-fetches every `intervalMs` while the tab is visible
 * and (optionally) while `active` still says the data is worth refreshing.
 *
 * The single-process JSON store makes polling the right fit here: it avoids
 * a WebSocket/SSE stack without losing liveness for either side of the desk.
 */
export function useLive<T>(fetcher: () => Promise<T>, { intervalMs = 10_000, active, refreshKey }: UseLiveOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const activeRef = useRef(active);
  activeRef.current = active;
  const dataRef = useRef(data);
  dataRef.current = data;

  const run = useCallback(async () => {
    try {
      const d = await fetcherRef.current();
      if (mounted.current) {
        setData(d);
        setError(null);
        setLoading(false);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    run();
    if (intervalMs <= 0) return () => {
      mounted.current = false;
    };

    const id = window.setInterval(async () => {
      if (document.hidden) return; // no point polling in the background tab
      if (activeRef.current && !activeRef.current(dataRef.current)) return;
      await run();
    }, intervalMs);

    const onVisible = async () => {
      if (!document.hidden && activeRef.current && activeRef.current(dataRef.current)) {
        await run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [run, intervalMs, refreshKey]);

  return { data, error, loading, reload: run };
}