"use client";

import React from "react";
import { RrMediaEntry, UserListDisplayType } from "./rrMediaListDisplay";
import { RrMediaCard } from "./rrMediaCard";
import { RrMediaListRow } from "./rrMediaListRow";
import { RrMediaCompactRow } from "./rrMediaCompactRow";
import { MediaItem } from "@/types/aquila";

export interface RrMediaListGroupProps {
  title: string;
  entries: RrMediaEntry[];
  displayType: UserListDisplayType;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

export function RrMediaListGroup({
  title,
  entries,
  displayType,
  baseUrl,
  isOwner,
  onRefresh,
}: RrMediaListGroupProps): React.JSX.Element | null {
  if (entries.length === 0) return null;

  return (
    <div
      className="mb-10 w-full select-none"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}
    >
      <h3 className="mb-4 text-base font-bold uppercase tracking-wider text-muted-foreground/80 pl-1">
        {title}
      </h3>

      {displayType === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {entries.map((entry) => {
            const mappedItem: MediaItem = {
              id: entry.id,
              title: entry.title,
              image: entry.image,
              progress: entry.progress ?? 0,
              episodes: null,
              format: entry.format ?? "",
              status: entry.status,
              last_updated: entry.last_updated,
              type: (entry.type?.toLowerCase() as any) || "anime",
            };

            return (
              <RrMediaCard
                key={entry.id}
                item={mappedItem}
                href={`${baseUrl}/${entry.id}`}
                isOwner={isOwner}
                score={entry.score}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}

      {displayType === "list" && (
        <div className="flex flex-col gap-1 rounded-2xl bg-card/20 backdrop-blur-md p-3 border border-border/30 shadow-md">
          {/* Header Row */}
          <div className="flex items-center justify-between w-full pr-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/20 pb-2 mb-2">
            <div className="flex-1 flex items-center justify-between gap-4 px-2">
              <span className="flex-1 text-left">Title</span>
              <div className="flex items-center gap-4 md:gap-6 justify-end w-[100px] md:w-[120px] shrink-0">
                <span className="w-8 text-right">Score</span>
                <span className="w-12 text-right">Progress</span>
              </div>
            </div>
            {isOwner && <div className="w-8 pr-1 shrink-0" />}
          </div>

          {entries.map((entry) => (
            <RrMediaListRow
              key={entry.id}
              entry={entry}
              baseUrl={baseUrl}
              isOwner={isOwner}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {displayType === "compact" && (
        <div className="flex flex-col gap-1 rounded-2xl bg-card/20 backdrop-blur-md p-3 border border-border/30 shadow-md">
          {/* Header Row */}
          <div className="flex items-center justify-between w-full pr-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 border-b border-border/20 pb-2 mb-2">
            <div className="flex-1 flex items-center justify-between gap-4 px-2">
              <span className="flex-1 text-left">Title</span>
              <div className="flex items-center gap-4 md:gap-6 justify-end w-[100px] sm:w-[180px] shrink-0">
                <span className="w-8 text-right">Score</span>
                <span className="w-12 text-right">Progress</span>
                <span className="w-16 text-right hidden sm:block">Type</span>
              </div>
            </div>
            {isOwner && <div className="w-8 pr-1 shrink-0" />}
          </div>

          {entries.map((entry) => (
            <RrMediaCompactRow
              key={entry.id}
              entry={entry}
              baseUrl={baseUrl}
              isOwner={isOwner}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
