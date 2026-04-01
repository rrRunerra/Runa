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
}

export const MediaListGroup: React.FC<MediaListGroupProps> = ({
  title,
  entries,
  displayType,
  baseUrl,
}) => {
  if (entries.length === 0) return null;

  return (
    <div className="mb-10 w-full" style={{ contentVisibility: "auto" }}>
      <h3 className="mb-4 text-xl font-semibold text-foreground">{title}</h3>
      
      {displayType === "grid" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
          {entries.map((entry) => (
            <MediaGridCard key={entry.id} entry={entry} baseUrl={baseUrl} />
          ))}
        </div>
      )}

      {displayType === "list" && (
        <div className="flex flex-col gap-1 rounded-lg bg-card/50 p-2 border border-border">
          <div className="flex px-4 py-2 text-xs font-semibold text-muted-foreground hidden sm:flex">
            <span className="flex-1">Title</span>
            <div className="flex w-1/4 justify-end gap-6 pr-2">
              <span className="w-8 text-right">Score</span>
              <span className="w-12 text-right">Progress</span>
            </div>
          </div>
          {entries.map((entry) => (
            <MediaListRow key={entry.id} entry={entry} baseUrl={baseUrl} />
          ))}
        </div>
      )}

      {displayType === "compact" && (
        <div className="flex flex-col gap-1 rounded-lg bg-card/50 p-2 border border-border">
          <div className="flex px-4 py-2 text-xs font-semibold text-muted-foreground hidden sm:flex">
            <span className="flex-1">Title</span>
            <div className="flex w-1/4 justify-end gap-6 pr-2">
              <span className="w-8 text-right">Score</span>
              <span className="w-12 text-right">Progress</span>
              <span className="w-16 text-right">Type</span>
            </div>
          </div>
          {entries.map((entry) => (
            <MediaCompactRow key={entry.id} entry={entry} baseUrl={baseUrl} />
          ))}
        </div>
      )}
    </div>
  );
};
