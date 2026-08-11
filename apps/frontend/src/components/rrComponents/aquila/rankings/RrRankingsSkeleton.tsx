"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface RrRankingsSkeletonProps {
  viewMode: "list" | "grid";
  count?: number;
}

export const RrRankingsSkeleton: React.FC<RrRankingsSkeletonProps> = ({
  viewMode,
  count = 10,
}) => {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl w-full animate-pulse"
          >
            <div className="aspect-3/4 w-full rounded-2xl bg-muted/60 border border-border/40" />
            <div className="flex flex-col gap-1.5 px-0.5">
              <div className="h-4 w-3/4 rounded-md bg-muted/70" />
              <div className="h-3 w-1/2 rounded-md bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-border/40 bg-card/30 animate-pulse"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Rank badge skeleton */}
            <div className="size-8 sm:size-10 rounded-xl bg-muted/70 shrink-0" />
            {/* Poster skeleton */}
            <div className="aspect-2/3 w-14 sm:w-16 rounded-xl bg-muted/70 shrink-0" />
            {/* Details skeleton */}
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="h-4 sm:h-5 w-2/3 sm:w-1/2 rounded-md bg-muted/80" />
              <div className="h-3 w-1/3 rounded-md bg-muted/50" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-4 w-12 rounded-md bg-muted/60" />
                <div className="h-4 w-14 rounded-md bg-muted/60" />
                <div className="h-4 w-16 rounded-md bg-muted/60 hidden sm:block" />
              </div>
            </div>
          </div>

          {/* Right score skeleton */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-3 w-12 rounded-md bg-muted/50" />
              <div className="h-7 w-20 rounded-xl bg-muted/70" />
            </div>
            <div className="h-8 w-24 rounded-xl bg-muted/60 hidden sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
};
