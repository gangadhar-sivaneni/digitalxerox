import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data-fetching hook: returns { data, error, loading, reload }.
 * Requests are guarded so a reload after unmount never updates state.
 */
export function useApi<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcherRef.current().then(
      (d) => {
        if (mounted.current) {
          setData(d);
          setLoading(false);
        }
      },
      (e) => {
        if (mounted.current) {
          setError(e);
          setLoading(false);
        }
      }
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  return { data, error, loading, reload: run };
}