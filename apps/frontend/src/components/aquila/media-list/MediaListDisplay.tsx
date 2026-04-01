"use client";

import React, { useMemo } from "react";
import { MediaEntry, MediaFilters, MediaListDisplayProps } from "./types";
import { MediaListGroup } from "./MediaListGroup";

export const MediaListDisplay: React.FC<MediaListDisplayProps> = ({
  lists,
  data,
  displayType,
  filters,
  sort,
  baseUrl,
}) => {
  // Memoize filtering to prevent expensive recalculations
  const filteredData = useMemo(() => {
    return data.filter((entry) => {
      if (filters.format && entry.type !== filters.format) return false;
      if (filters.status && entry.status !== filters.status) return false;
      // Add other filters as needed...
      return true;
    });
  }, [data, filters]);

  // Memoize sorting
  const sortedData = useMemo(() => {
    // We use toSorted() or [].sort() natively if supported, but to match the 'vercel-react-best-practices' immutability,
    // we map a shallow copy and sort it:
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
          return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        case "last_added":
          return new Date(b.last_added).getTime() - new Date(a.last_added).getTime();
        default:
          return 0;
      }
    });
    return copy;
  }, [filteredData, sort]);

  // Derive grouped data for multiple lists efficiently
  const groupedData = useMemo(() => {
    const groups: Record<string, MediaEntry[]> = {};
    
    // Initialize groups in the requested order
    lists.forEach((listName) => {
      groups[listName] = [];
    });

    sortedData.forEach((entry) => {
      // Find matching group or fallback to a general status matching
      const targetList = lists.find(l => l.toLowerCase() === entry.status.toLowerCase()) || entry.status;
      if (!groups[targetList]) groups[targetList] = [];
      groups[targetList].push(entry);
    });

    return groups;
  }, [sortedData, lists]);

  return (
    <div className="flex w-full flex-col gap-8">
      {lists.map((listName) => (
        <MediaListGroup
          key={listName}
          title={listName}
          entries={groupedData[listName] || []}
          displayType={displayType}
          baseUrl={baseUrl}
        />
      ))}
      
      {/* Dynamic groups that we didn't initially define, but still exist in data */}
      {Object.keys(groupedData)
        .filter((k) => !lists.includes(k))
        .map((listName) => (
          <MediaListGroup
            key={listName}
            title={listName}
            entries={groupedData[listName]}
            displayType={displayType}
            baseUrl={baseUrl}
          />
        ))}
    </div>
  );
};
