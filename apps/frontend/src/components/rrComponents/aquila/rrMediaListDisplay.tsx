"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { RrMediaListGroup } from "./rrMediaListGroup";

export type UserListDisplayType = "grid" | "list" | "compact";

export interface RrMediaEntry {
  id: string;
  title: string;
  score?: number | null;
  progress?: number | null;
  episodes?: number | null;
  seasons?: number | null;
  image: string;
  type: string;
  format?: string;
  status: string;
  last_updated: string;
  last_added: string;
}

export interface RrMediaListFiltersState {
  format?: string | string[];
  status?: string | string[];
  mediaStatus?: string | string[];
  genres?: string[];
  country?: string;
  year?: number | string | (number | string)[];
}

export interface RrMediaListDisplayProps {
  lists: string[];
  data: RrMediaEntry[];
  displayType: UserListDisplayType;
  filters: RrMediaListFiltersState;
  sort:
    | "title"
    | "score"
    | "progress"
    | "episode_count"
    | "season_count"
    | "last_updated"
    | "last_added"
    | string
    | string[];
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

export function RrMediaListDisplay({
  lists,
  data,
  displayType,
  filters,
  sort,
  baseUrl,
  isOwner,
  onRefresh,
}: RrMediaListDisplayProps): React.JSX.Element {
  // Stabilize onRefresh callback to prevent breaking child component memoization
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const stableOnRefresh = useCallback(() => {
    onRefreshRef.current?.();
  }, []);

  // Memoize filtering to prevent expensive recalculations
  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      if (filters.format) {
        const formats = Array.isArray(filters.format)
          ? filters.format
          : filters.format.split(",").map((f) => f.trim()).filter(Boolean);
        if (formats.length > 0 && (!entry.format || !formats.includes(entry.format))) {
          return false;
        }
      }
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : filters.status.split(",").map((s) => s.trim()).filter(Boolean);
        if (statuses.length > 0 && (!entry.status || !statuses.includes(entry.status))) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters]);

  // Memoize multi-criteria sorting
  const sortedData = useMemo(() => {
    const copy = [...filteredData];
    const sortList: string[] = Array.isArray(sort)
      ? sort
      : typeof sort === "string"
        ? sort.split(",").map((s) => s.trim()).filter(Boolean)
        : ["last_updated"];

    if (sortList.length === 0) return copy;

    copy.sort((a, b) => {
      for (const s of sortList) {
        let diff = 0;
        switch (s) {
          case "title":
            diff = a.title.localeCompare(b.title);
            break;
          case "score":
            diff = (b.score || 0) - (a.score || 0);
            break;
          case "progress":
            diff = (b.progress || 0) - (a.progress || 0);
            break;
          case "episode_count":
            diff = (b.episodes || 0) - (a.episodes || 0);
            break;
          case "season_count":
            diff = (b.seasons || 0) - (a.seasons || 0);
            break;
          case "last_updated":
            diff =
              new Date(b.last_updated).getTime() -
              new Date(a.last_updated).getTime();
            break;
          case "last_added":
            diff =
              new Date(b.last_added).getTime() -
              new Date(a.last_added).getTime();
            break;
          default:
            diff = 0;
        }
        if (diff !== 0) return diff;
      }
      return 0;
    });
    return copy;
  }, [filteredData, sort]);

  // Helper for status matching (normalizes spaces/underscores and status aliases)
  const isStatusMatch = (listName: string, entryStatus: string) => {
    const normList = listName.toLowerCase().replace(/[\s_]+/g, "");
    const normStatus = entryStatus.toLowerCase().replace(/[\s_]+/g, "");
    if (normList === normStatus) return true;
    if (
      normList === "planning" &&
      ["plantowatch", "plantoread", "plantoplay"].includes(normStatus)
    ) {
      return true;
    }
    if (normList === "onhold" && normStatus === "paused") return true;
    return false;
  };

  // Derive grouped data for multiple lists efficiently
  const groupedData = useMemo(() => {
    const groups: Record<string, RrMediaEntry[]> = {};

    // Initialize groups in the requested order
    lists.forEach((listName) => {
      groups[listName] = [];
    });

    sortedData.forEach((entry) => {
      // Find matching group or fallback to entry.status
      const targetList =
        lists.find((l) => isStatusMatch(l, entry.status)) || entry.status;
      if (!groups[targetList]) groups[targetList] = [];
      groups[targetList].push(entry);
    });

    return groups;
  }, [sortedData, lists]);

  return (
    <div className="flex w-full flex-col gap-8">
      {lists.map((listName) => (
        <RrMediaListGroup
          key={listName}
          title={listName}
          entries={groupedData[listName] || []}
          displayType={displayType}
          baseUrl={baseUrl}
          isOwner={isOwner}
          onRefresh={stableOnRefresh}
        />
      ))}

      {/* Dynamic groups that we didn't initially define, but still exist in data */}
      {Object.keys(groupedData)
        .filter((k) => !lists.includes(k))
        .map((listName) => (
          <RrMediaListGroup
            key={listName}
            title={listName}
            entries={groupedData[listName]}
            displayType={displayType}
            baseUrl={baseUrl}
            isOwner={isOwner}
            onRefresh={stableOnRefresh}
          />
        ))}
    </div>
  );
}
