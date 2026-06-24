import { useEffect, useState, useRef } from "react";

const globalCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export function useFetch<T>(
  url: string,
  options?: RequestInit & { enabled?: boolean; useCache?: boolean }
) {
  const cacheKey = options?.useCache ? url : null;
  const initialCache = cacheKey ? globalCache.get(cacheKey) : null;
  const isCacheValid = initialCache && (Date.now() - initialCache.timestamp < CACHE_TTL);

  const [data, setData] = useState<T | null>(isCacheValid ? initialCache.data : null);
  const [loading, setLoading] = useState(!isCacheValid && options?.enabled !== false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track changes of options that typically change to avoid infinite loops from inline object/array definitions
  const headersString = options?.headers ? JSON.stringify(options.headers) : "";
  const bodyString = typeof options?.body === "string" ? options.body : "";
  const method = options?.method;
  const enabled = options?.enabled;
  const useCache = options?.useCache;

  useEffect(() => {
    const controller = new AbortController();

    if (enabled === false) {
      if (!isCacheValid) setLoading(false);
      return;
    }

    async function load() {
      // Check cache again in case it was populated by another component instance
      if (useCache) {
        const cached = globalCache.get(url);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setData(cached.data);
          setLoading(false);
          return; // Skip fetch if we have valid cache
        }
      }

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url, { 
          ...optionsRef.current,
          signal: controller.signal 
        });
        if (!res.ok) throw new Error("Request failed");

        const json = await res.json();
        
        if (useCache) {
          globalCache.set(url, { data: json, timestamp: Date.now() });
        }
        
        setData(json);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url, method, headersString, bodyString, enabled, refetchIndex, useCache]);

  const refetch = () => setRefetchIndex((prev) => prev + 1);

  return { data, loading, error, refetch };
}
