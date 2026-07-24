"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface RrMediaDetailsSkeletonProps {
  type?: "media" | "character" | "actor";
}

export function RrMediaDetailsSkeleton({
  type = "media",
}: RrMediaDetailsSkeletonProps): React.JSX.Element {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background text-foreground relative overflow-x-hidden">
      {/* Background Radial Glowing Auras */}
      <div className="absolute top-0 right-0 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[20%] -left-25 w-75 h-75 bg-primary/2 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Banner Section Skeleton */}
      <div className="relative h-60 md:h-90 w-full overflow-hidden shrink-0 z-10 bg-muted/20">
        <Skeleton className="w-full h-full rounded-none opacity-40 animate-pulse" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background to-transparent z-10" />
      </div>

      {/* Details layout container */}
      <div className="px-4 md:px-8 pb-16 -mt-16 md:-mt-24 relative z-20 w-full">
        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Left Column - Cover & Main Actions Skeleton */}
          <div className="shrink-0 w-full lg:w-65 flex flex-col gap-4">
            <div className="flex flex-row lg:flex-col gap-4 items-end lg:items-stretch lg:bg-card/75 lg:border lg:border-border/40 lg:backdrop-blur-xl lg:shadow-2xl lg:rounded-2xl lg:p-4">
              {/* Cover Poster Image Skeleton */}
              <div className="relative w-32 sm:w-40 lg:w-full aspect-2/3 shrink-0 rounded-xl lg:rounded-xl overflow-hidden shadow-2xl border border-border/40 bg-muted/40">
                <Skeleton className="size-full rounded-xl" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex-1 flex flex-col gap-2.5 w-full justify-end lg:justify-center mb-1 lg:mb-0">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>

            {/* Mobile Title Skeleton */}
            <div className="space-y-2 lg:hidden mt-1">
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>

            {/* Media Metadata Stats Sidebar Skeleton */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-5 space-y-4">
              {/* Key Stats Block Skeleton (for media pages) */}
              {type === "media" && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30">
                  <Skeleton className="size-10 rounded-xl shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-6 w-16 rounded" />
                  </div>
                </div>
              )}

              {/* Sidebar Info Rows */}
              <div className="space-y-3.5 pt-1">
                {Array.from({ length: type === "media" ? 6 : 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-3.5 w-28 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Main Info & Tabs Skeleton */}
          <div className="flex-1 min-w-0 space-y-6 lg:mt-8">
            {/* Desktop Header / Title Skeleton */}
            <div className="hidden lg:block space-y-2.5">
              <Skeleton className="h-10 w-2/3 rounded-xl" />
              <Skeleton className="h-4 w-1/3 rounded-md" />
            </div>

            {/* Tags / Badges Row Skeleton */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>

            {/* Description Block Skeleton */}
            <div className="bg-card/65 border border-border/40 backdrop-blur-xl rounded-2xl p-6 space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-[95%] rounded" />
              <Skeleton className="h-4 w-[90%] rounded" />
              <Skeleton className="h-4 w-[85%] rounded" />
              <Skeleton className="h-4 w-[60%] rounded" />
            </div>

            {/* Content Cards / Characters Section Skeleton */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 p-2 rounded-xl border border-border/30 bg-card/40"
                  >
                    <Skeleton className="w-full aspect-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RrMediaDetailsSkeleton;
