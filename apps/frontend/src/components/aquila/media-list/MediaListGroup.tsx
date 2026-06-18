"use client";

import React from "react";
import { MediaEntry, DisplayType } from "./types";
import { MediaGridCard } from "./MediaGridCard";
import { MediaListRow } from "./MediaListRow";
import { MediaCompactRow } from "./MediaCompactRow";

interface MediaListGroupProps {
  title: string;
  entries: MediaEntry[];
  displayType: DisplayType;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

export const MediaListGroup: React.FC<MediaListGroupProps> = ({
  title,
  entries,
  displayType,
  baseUrl,
  isOwner,
  onRefresh,
}) => {
  if (entries.length === 0) return null;

  return (
    <div className="mb-10 w-full" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
      <h3 className="mb-4 text-xl font-semibold text-foreground">{title}</h3>
      
      {displayType === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {entries.map((entry) => (
            <MediaGridCard
              key={entry.id}
              entry={entry}
              baseUrl={baseUrl}
              isOwner={isOwner}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {displayType === "list" && (
        <div className="flex flex-col gap-1 rounded-lg bg-card/50 p-2 border border-border">
          <div className="flex items-center justify-between w-full pr-2 text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1.5 mb-1">
            <div className="flex-1 flex items-center justify-between gap-4 py-2 px-2">
              <span className="flex-1 text-left">Title</span>
              <div className="flex items-center gap-4 md:gap-6 justify-end w-[100px] md:w-[120px] shrink-0">
                <span className="w-8 text-right">Score</span>
                <span className="w-12 text-right">Progress</span>
              </div>
            </div>
            {isOwner && (
              <div className="w-8 pr-1 shrink-0" />
            )}
          </div>
          {entries.map((entry) => (
            <MediaListRow
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
        <div className="flex flex-col gap-1 rounded-lg bg-card/50 p-2 border border-border">
          <div className="flex items-center justify-between w-full pr-2 text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1.5 mb-1">
            <div className="flex-1 flex items-center justify-between gap-4 py-2 px-2">
              <span className="flex-1 text-left">Title</span>
              <div className="flex items-center gap-4 md:gap-6 justify-end w-[100px] sm:w-[180px] shrink-0">
                <span className="w-8 text-right">Score</span>
                <span className="w-12 text-right">Progress</span>
                <span className="w-16 text-right hidden sm:block">Type</span>
              </div>
            </div>
            {isOwner && (
              <div className="w-8 pr-1 shrink-0" />
            )}
          </div>
          {entries.map((entry) => (
            <MediaCompactRow
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
};
