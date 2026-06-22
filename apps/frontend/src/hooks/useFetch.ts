import { useEffect, useState, useRef } from "react";

export function useFetch<T>(
  url: string,
  options?: RequestInit & { enabled?: boolean },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options?.enabled !== false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track changes of options that typically change to avoid infinite loops from inline object/array definitions
  const headersString = options?.headers ? JSON.stringify(options.headers) : "";
  const bodyString = typeof options?.body === "string" ? options.body : "";
  const method = options?.method;
  const enabled = options?.enabled;

  useEffect(() => {
    const controller = new AbortController();

    if (enabled === false) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(url, { 
          ...optionsRef.current,
          signal: controller.signal 
        });
        if (!res.ok) throw new Error("Request failed");

        const json = await res.json();
        setData(json);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [url, method, headersString, bodyString, enabled, refetchIndex]);

  const refetch = () => setRefetchIndex((prev) => prev + 1);

  return { data, loading, error, refetch };
}
