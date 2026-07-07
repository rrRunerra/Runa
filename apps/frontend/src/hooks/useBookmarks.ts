"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface Bookmark {
  id: string;
  name: string;
  description?: string;
  redirect: string;
  stars?: { ra: number; dec: number; magnitude: number }[];
  connections?: [number, number][];
  icon?: string;
  connectionColor?: string;
  starColor?: string;
}

// Global in-memory cache
let cachedBookmarks: Bookmark[] | null = null;
let cachedToken: string | null = null;
let activePromise: Promise<Bookmark[]> | null = null;
const listeners = new Set<() => void>();

export interface UseBookmarksOptions {
  enabled?: boolean;
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  const { enabled = true } = options;
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Clear cache if token changes
  if (token !== cachedToken) {
    cachedToken = token || null;
    cachedBookmarks = null;
    activePromise = null;
  }

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(cachedBookmarks || []);
  const [loading, setLoading] = useState(!cachedBookmarks && !!token && enabled);

  useEffect(() => {
    if (!token || !enabled) {
      setLoading(false);
      return;
    }

    // Subscribe to cache updates
    const onChange = () => {
      setBookmarks(cachedBookmarks || []);
      setLoading(false);
    };
    listeners.add(onChange);

    // If cache is empty and not fetching, start fetching
    if (!cachedBookmarks && !activePromise) {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/bookmarks`;
      activePromise = fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch bookmarks");
          return res.json();
        })
        .then((data) => {
          cachedBookmarks = data;
          activePromise = null;
          listeners.forEach((listener) => listener());
          return data;
        })
        .catch((err) => {
          console.error("Error fetching bookmarks:", err);
          activePromise = null;
          setLoading(false);
          throw err;
        });
    }

    // If fetch is in progress, update local state when done
    if (activePromise && !cachedBookmarks) {
      setLoading(true);
    } else {
      setBookmarks(cachedBookmarks || []);
      setLoading(false);
    }

    return () => {
      listeners.delete(onChange);
    };
  }, [token, enabled]);

  // Listener for global event to invalidate cache
  useEffect(() => {
    if (!token) return;

    const handleGlobalChange = async () => {
      // Force refetch
      const url = `${process.env.NEXT_PUBLIC_API_URL}/bookmarks`;
      activePromise = fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch bookmarks");
          return res.json();
        })
        .then((data) => {
          cachedBookmarks = data;
          activePromise = null;
          listeners.forEach((listener) => listener());
          return data;
        })
        .catch((err) => {
          console.error("Error updating bookmarks on event:", err);
          activePromise = null;
          throw err;
        });
    };

    window.addEventListener("runa-bookmarks-changed", handleGlobalChange);
    return () => {
      window.removeEventListener("runa-bookmarks-changed", handleGlobalChange);
    };
  }, [token]);

  const mutate = async () => {
    if (!token) return;
    setLoading(true);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/bookmarks`;
    activePromise = fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch bookmarks");
        return res.json();
      })
      .then((data) => {
        cachedBookmarks = data;
        activePromise = null;
        listeners.forEach((listener) => listener());
        return data;
      })
      .catch((err) => {
        console.error("Error mutating bookmarks:", err);
        activePromise = null;
        setLoading(false);
        throw err;
      });
    return activePromise;
  };

  return {
    bookmarks,
    loading,
    mutate,
  };
}
