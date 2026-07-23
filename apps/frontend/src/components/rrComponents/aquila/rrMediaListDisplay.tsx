"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { RrMediaListGroup } from "./rrMediaListGroup";

export type UserListDisplayType = "grid" | "list" | "compact";

export interface RrMediaEntry {
  id: string;
  title: string;
  score?: number;
  progress?: number;
  image: string;
  type: string;
  format?: string;
  status: string;
  last_updated: string;
  last_added: string;
}

export interface RrMediaListFiltersState {
  format?: string;
  status?: string;
  genres?: string[];
  country?: string;
  year?: number;
}

export interface RrMediaListDisplayProps {
  lists: string[];
  data: RrMediaEntry[];
  displayType: UserListDisplayType;
  filters: RrMediaListFiltersState;
  sort: "title" | "score" | "progress" | "last_updated" | "last_added";
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
      if (filters.format && entry.format !== filters.format) return false;
      if (filters.status && entry.status !== filters.status) return false;
      return true;
    });
  }, [data, filters]);

  // Memoize sorting
  const sortedData = useMemo(() => {
    const copy = [...filteredData];
    copy.sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "score":
          return (b.score || 0) - (a.score || 0);
        case "progress":
          return (b.progress || 0) - (a.progress || 0);
        case "last_updated":
          return (
            new Date(b.last_updated).getTime() -
            new Date(a.last_updated).getTime()
          );
        case "last_added":
          return (
            new Date(b.last_added).getTime() - new Date(a.last_added).getTime()
          );
        default:
          return 0;
      }
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
