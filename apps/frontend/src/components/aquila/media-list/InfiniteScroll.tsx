"use client";

import React, { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Walks up the DOM tree from `el` to find the nearest ancestor that
 * is actually scrollable (i.e. has overflow-y: auto or scroll and
 * scrollable content). Falls back to `null` (the viewport) if none found.
 */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;

  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;

    if (isScrollable) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasMore,
  isLoading,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = observerTarget.current;
    if (!el) return;

    const scrollParent = getScrollParent(el);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: scrollParent, // null = viewport (mobile), element = desktop sidebar inset
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div ref={observerTarget} className="h-16 flex items-center justify-center w-full mt-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
};
