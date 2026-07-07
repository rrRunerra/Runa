"use client";

import { useNotificationAndBookmarks } from "@/components/Providers/rrNotificationAndBookmarksProvider";
import type { Bookmark } from "@/components/Providers/rrNotificationAndBookmarksProvider";

export type { Bookmark };

export interface UseBookmarksOptions {
  enabled?: boolean;
}

export function useBookmarks(options: UseBookmarksOptions = {}) {
  const { bookmarks, loadingBookmarks, refetchBookmarks } = useNotificationAndBookmarks();

  return {
    bookmarks,
    loading: loadingBookmarks,
    mutate: refetchBookmarks,
  };
}
