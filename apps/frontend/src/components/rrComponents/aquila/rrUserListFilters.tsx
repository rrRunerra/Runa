"use client";

import React, { useMemo } from "react";
import RrLapplandLayingRight from "@/components/rrComponents/rrImages/rrLapplandLayingRight";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { fetcher } from "@/lib/fetcher";
import * as Lucide from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RrUserListFilterState {
  format?: string | string[];
  genres?: string[];
  year?: string | string[];
  mediaStatus?: string | string[];
}

export type UserListSortType =
  | "title"
  | "score"
  | "progress"
  | "episode_count"
  | "season_count"
  | "last_updated"
  | "last_added";

export interface RrUserListFiltersProps {
  username: string;
  mediaType: string;
  searchVal: string;
  setSearchVal: (val: string) => void;
  sort: UserListSortType | UserListSortType[] | string | string[];
  setSort: (val: UserListSortType[] | UserListSortType | any) => void;
  sortOptions: { label: string; value: string }[];
  filters: RrUserListFilterState;
  setFilters: React.Dispatch<React.SetStateAction<RrUserListFilterState>>;
  searchPlaceholder?: string;
}

export function RrUserListFilters({
  username,
  mediaType,
  searchVal,
  setSearchVal,
  sort,
  setSort,
  sortOptions,
  filters,
  setFilters,
  searchPlaceholder,
}: RrUserListFiltersProps): React.JSX.Element {
  const { t } = useTranslation();

  // Normalize sort array
  const activeSorts: UserListSortType[] = useMemo(() => {
    if (Array.isArray(sort)) {
      return (sort.filter(Boolean) as UserListSortType[]).length > 0
        ? (sort.filter(Boolean) as UserListSortType[])
        : ["last_updated"];
    }
    if (typeof sort === "string") {
      const parsed = sort
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as UserListSortType[];
      return parsed.length > 0 ? parsed : ["last_updated"];
    }
    return ["last_updated"];
  }, [sort]);

  const activeFormats: string[] = useMemo(() => {
    if (Array.isArray(filters.format)) return filters.format.filter(Boolean);
    if (typeof filters.format === "string" && filters.format) {
      return filters.format.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [filters.format]);

  const activeStatuses: string[] = useMemo(() => {
    if (Array.isArray(filters.mediaStatus))
      return filters.mediaStatus.filter(Boolean);
    if (typeof filters.mediaStatus === "string" && filters.mediaStatus) {
      return filters.mediaStatus
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [filters.mediaStatus]);

  const activeGenres: string[] = useMemo(() => {
    if (Array.isArray(filters.genres)) return filters.genres.filter(Boolean);
    if (typeof filters.genres === "string" && filters.genres) {
      return (filters.genres as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [filters.genres]);

  const activeYears: string[] = useMemo(() => {
    if (Array.isArray(filters.year))
      return (filters.year as string[]).map(String).filter(Boolean);
    if (typeof filters.year === "string" && filters.year) {
      return filters.year.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [filters.year]);

  const handleToggleSort = (val: UserListSortType) => {
    const isPresent = activeSorts.includes(val);
    let next: UserListSortType[];

    if (isPresent) {
      if (activeSorts.length === 1 && activeSorts[0] === val) {
        next = ["last_updated"];
      } else {
        next = activeSorts.filter((s) => s !== val);
        if (next.length === 0) next = ["last_updated"];
      }
    } else {
      if (activeSorts.length === 1 && activeSorts[0] === "last_updated") {
        next = [val];
      } else {
        next = [...activeSorts, val];
      }
    }

    setSort(next);
  };

  const handleRemoveSort = (val: UserListSortType) => {
    let next = activeSorts.filter((s) => s !== val);
    if (next.length === 0) next = ["last_updated"];
    setSort(next);
  };

  const handleToggleFilter = (
    key: "format" | "mediaStatus" | "genres" | "year",
    value: string,
  ) => {
    setFilters((prev) => {
      let current: string[] = [];
      const prevVal = prev[key];
      if (Array.isArray(prevVal)) {
        current = prevVal.map(String).filter(Boolean);
      } else if (typeof prevVal === "string" && prevVal) {
        current = prevVal.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const isSelected = current.includes(value);
      const next = isSelected
        ? current.filter((v) => v !== value)
        : [...current, value];

      return {
        ...prev,
        [key]: next,
      };
    });
  };

  const handleClearFilter = (
    key: "format" | "mediaStatus" | "genres" | "year",
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: [],
    }));
  };

  // Query dynamic filter options from backend
  const { data: filterOptions } = useSWR<{
    genres: string[];
    years: (number | string)[];
    formats: string[];
    statuses: string[];
  }>(
    username
      ? `${process.env.NEXT_PUBLIC_API_URL}/list/${mediaType}/user/${username}/filters`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const availableGenres = filterOptions?.genres || [];
  const availableYears = filterOptions?.years || [];
  const availableFormats = filterOptions?.formats || [];
  const availableStatuses = filterOptions?.statuses || [];

  const hasActiveFilters =
    searchVal !== "" ||
    activeFormats.length > 0 ||
    activeStatuses.length > 0 ||
    activeGenres.length > 0 ||
    activeYears.length > 0 ||
    activeSorts.length > 1 ||
    (activeSorts.length === 1 && activeSorts[0] !== "last_updated");

  const handleReset = () => {
    setSearchVal("");
    setSort(["last_updated"]);
    setFilters({
      format: [],
      genres: [],
      year: [],
      mediaStatus: [],
    });
  };

  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t("aquila.searchPlaceholder");

  // Helpers for label translations
  const getSortLabel = (val: string, fallbackLabel: string) => {
    switch (val) {
      case "title":
        return t("aquila.sortTitle", "Title");
      case "score":
        return t("aquila.sortScore", "Score");
      case "progress":
        return t("aquila.sortProgress", "Progress");
      case "episode_count":
        return fallbackLabel.toLowerCase().includes("chapter")
          ? t("aquila.sortChapterCount", "Chapter Count")
          : t("aquila.sortEpisodeCount", "Episode Count");
      case "season_count":
        return t("aquila.sortSeasonCount", "Season Count");
      case "last_updated":
        return t("aquila.sortLastUpdated", "Last Updated");
      case "last_added":
        return t("aquila.sortLastAdded", "Last Added");
      default:
        return fallbackLabel;
    }
  };

  const getSortTriggerLabel = () => {
    if (
      activeSorts.length === 0 ||
      (activeSorts.length === 1 && activeSorts[0] === "last_updated")
    ) {
      return t("aquila.sortLastUpdated", "Last Updated");
    }
    const firstOpt = sortOptions.find((o) => o.value === activeSorts[0]);
    const firstLabel = getSortLabel(
      activeSorts[0],
      firstOpt?.label ?? activeSorts[0],
    );
    if (activeSorts.length === 1) {
      return firstLabel;
    }
    return `${firstLabel} (+${activeSorts.length - 1})`;
  };

  const getFormatLabel = (format: string) => {
    switch (format.toUpperCase().replace(/\s+/g, "_")) {
      case "MOVIE":
        return t("aquila.formatMovie", "Movie");
      case "TV":
        return t("aquila.formatTV", "TV");
      case "TV_SHORT":
        return t("aquila.formatTVShort", "TV Short");
      case "SPECIAL":
        return t("aquila.formatSpecial", "Special");
      case "OVA":
        return t("aquila.formatOVA", "OVA");
      case "ONA":
        return t("aquila.formatONA", "ONA");
      case "MANGA":
        return t("aquila.formatManga", "Manga");
      case "NOVEL":
        return t("aquila.formatNovel", "Novel");
      case "ONE_SHOT":
        return t("aquila.formatOneShot", "One Shot");
      case "LIGHT_NOVEL":
        return t("aquila.formatLightNovel", "Light Novel");
      case "DOUJINSHI":
        return t("aquila.formatDoujinshi", "Doujinshi");
      case "GAME":
        return t("aquila.formatGame", "Game");
      case "BOOK":
        return t("aquila.formatBook", "Book");
      case "UNKNOWN":
        return t("aquila.formatUnknown", "Unknown");
      default:
        return format.replace(/_/g, " ");
    }
  };

  const getMediaStatusLabel = (status: string) => {
    switch (status.toUpperCase().replace(/\s+/g, "_")) {
      case "FINISHED":
      case "ENDED":
        return t("aquila.statusFinished", "Finished");
      case "RELEASING":
      case "CONTINUING":
        return t("aquila.statusReleasing", "Releasing");
      case "RELEASED":
        return t("aquila.statusReleased", "Released");
      case "NOT_YET_RELEASED":
      case "NOT YET RELEASED":
      case "UPCOMING":
        return t("aquila.statusNotYetReleased", "Upcoming");
      case "CANCELLED":
        return t("aquila.statusCancelled", "Cancelled");
      case "HIATUS":
        return t("aquila.statusHiatus", "Hiatus");
      default:
        return status.replace(/_/g, " ");
    }
  };

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);

  const activeFilterCount =
    activeFormats.length +
    activeStatuses.length +
    activeGenres.length +
    activeYears.length +
    (activeSorts.length > 1 ||
    (activeSorts.length === 1 && activeSorts[0] !== "last_updated")
      ? 1
      : 0);

  return (
    <div className="relative flex flex-col gap-3 w-full border-t border-border/40 pt-3 select-none">
      <div className="flex flex-col xl:flex-row gap-2.5 items-stretch xl:items-center justify-between">
        {/* Left Side: Search bar + Mobile Filter toggle */}
        <div className="flex items-center gap-2 flex-1 max-w-full xl:max-w-xs">
          <div className="relative flex-1">
            <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder={resolvedSearchPlaceholder}
              suppressHydrationWarning
              className="pl-9 h-9.5 bg-background/40 border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl placeholder:text-muted-foreground/40 text-xs"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => setSearchVal("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-4 flex items-center justify-center cursor-pointer"
              >
                <Lucide.X className="size-3" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle Button */}
          <Button
            type="button"
            variant={
              isMobileFiltersOpen || activeFilterCount > 0
                ? "secondary"
                : "outline"
            }
            size="sm"
            onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
            className={cn(
              "xl:hidden h-9.5 px-3 rounded-xl gap-1.5 shrink-0 font-medium text-xs border-border/40 transition-all cursor-pointer",
              activeFilterCount > 0 &&
                "border-primary/50 text-primary bg-primary/10",
            )}
          >
            <Lucide.SlidersHorizontal className="size-3.5" />
            <span>{t("aquila.searchFilters", "Filters")}</span>
            {activeFilterCount > 0 && (
              <span className="size-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Reset Filters Button (Mobile) */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="xl:hidden size-9.5 rounded-xl hover:bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
              title={t("aquila.resetAllFilters", "Reset all filters")}
            >
              <Lucide.RotateCcw className="size-4" />
            </Button>
          )}
        </div>

        {/* Lappland: fills the gap, pushed right to sit next to the filters */}
        <div className="hidden xl:flex flex-1 items-end justify-end pointer-events-none select-none">
          <RrLapplandLayingRight className="h-16 w-auto text-foreground/20" />
        </div>

        {/* Right Side: Row / Grid of Select Dropdowns */}
        <div
          className={cn(
            "grid grid-cols-2 gap-2 w-full xl:w-auto xl:flex xl:flex-wrap xl:items-center xl:gap-2",
            !isMobileFiltersOpen && "hidden xl:flex",
          )}
        >
          {/* Format/Type Multi-Filter */}
          {availableFormats.length > 0 && (
            <div className="flex items-center gap-1.5 w-full xl:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-between gap-1.5 h-9.5 px-3 w-full xl:w-auto xl:min-w-28 bg-background/40 hover:bg-background/60 border border-border/40 text-xs rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                      activeFormats.length > 0 &&
                        "border-primary/50 text-foreground font-medium bg-primary/5",
                    )}
                  >
                    <span className="truncate" suppressHydrationWarning>
                      {activeFormats.length === 0
                        ? t("aquila.format", "Format")
                        : activeFormats.length === 1
                          ? getFormatLabel(activeFormats[0])
                          : `${getFormatLabel(activeFormats[0])} (+${activeFormats.length - 1})`}
                    </span>
                    <Lucide.ChevronDown className="size-3.5 opacity-50 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {t("aquila.format", "Format")}
                  </DropdownMenuLabel>
                  {activeFormats.length > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleClearFilter("format");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                      >
                        <Lucide.RotateCcw className="size-3 mr-1.5" />
                        {t("aquila.allFormats", "Clear (All Formats)")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableFormats.map((f) => {
                    const isSelected = activeFormats.includes(f);
                    return (
                      <DropdownMenuItem
                        key={f}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFilter("format", f);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                          isSelected &&
                            "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <span suppressHydrationWarning>
                          {getFormatLabel(f)}
                        </span>
                        {isSelected && <Lucide.Check className="size-3.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Media Release Status Multi-Filter */}
          {availableStatuses.length > 0 && (
            <div className="flex items-center gap-1.5 w-full xl:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-between gap-1.5 h-9.5 px-3 w-full xl:w-auto xl:min-w-28 bg-background/40 hover:bg-background/60 border border-border/40 text-xs rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                      activeStatuses.length > 0 &&
                        "border-primary/50 text-foreground font-medium bg-primary/5",
                    )}
                  >
                    <span className="truncate" suppressHydrationWarning>
                      {activeStatuses.length === 0
                        ? t("aquila.status", "Status")
                        : activeStatuses.length === 1
                          ? getMediaStatusLabel(activeStatuses[0])
                          : `${getMediaStatusLabel(activeStatuses[0])} (+${activeStatuses.length - 1})`}
                    </span>
                    <Lucide.ChevronDown className="size-3.5 opacity-50 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-48 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {t("aquila.status", "Status")}
                  </DropdownMenuLabel>
                  {activeStatuses.length > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleClearFilter("mediaStatus");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                      >
                        <Lucide.RotateCcw className="size-3 mr-1.5" />
                        {t("aquila.allStatuses", "Clear (All Statuses)")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableStatuses.map((s) => {
                    const isSelected = activeStatuses.includes(s);
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFilter("mediaStatus", s);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                          isSelected &&
                            "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <span suppressHydrationWarning>
                          {getMediaStatusLabel(s)}
                        </span>
                        {isSelected && <Lucide.Check className="size-3.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Genres Multi-Filter */}
          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5 w-full xl:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-between gap-1.5 h-9.5 px-3 w-full xl:w-auto xl:min-w-28 bg-background/40 hover:bg-background/60 border border-border/40 text-xs rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                      activeGenres.length > 0 &&
                        "border-primary/50 text-foreground font-medium bg-primary/5",
                    )}
                  >
                    <span className="truncate" suppressHydrationWarning>
                      {activeGenres.length === 0
                        ? t("aquila.genre", "Genre")
                        : activeGenres.length === 1
                          ? activeGenres[0]
                          : `${activeGenres[0]} (+${activeGenres.length - 1})`}
                    </span>
                    <Lucide.ChevronDown className="size-3.5 opacity-50 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-52 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {t("aquila.genre", "Genre")}
                  </DropdownMenuLabel>
                  {activeGenres.length > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleClearFilter("genres");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                      >
                        <Lucide.RotateCcw className="size-3 mr-1.5" />
                        {t("aquila.allGenres", "Clear (All Genres)")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableGenres.map((g) => {
                    const isSelected = activeGenres.includes(g);
                    return (
                      <DropdownMenuItem
                        key={g}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFilter("genres", g);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                          isSelected &&
                            "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <span>{g}</span>
                        {isSelected && <Lucide.Check className="size-3.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Year Multi-Filter */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1.5 w-full xl:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-between gap-1.5 h-9.5 px-3 w-full xl:w-auto xl:min-w-24 bg-background/40 hover:bg-background/60 border border-border/40 text-xs rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                      activeYears.length > 0 &&
                        "border-primary/50 text-foreground font-medium bg-primary/5",
                    )}
                  >
                    <span className="truncate" suppressHydrationWarning>
                      {activeYears.length === 0
                        ? t("aquila.year", "Year")
                        : activeYears.length === 1
                          ? activeYears[0]
                          : `${activeYears[0]} (+${activeYears.length - 1})`}
                    </span>
                    <Lucide.ChevronDown className="size-3.5 opacity-50 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-44 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    {t("aquila.year", "Year")}
                  </DropdownMenuLabel>
                  {activeYears.length > 0 && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleClearFilter("year");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                      >
                        <Lucide.RotateCcw className="size-3 mr-1.5" />
                        {t("aquila.allYears", "Clear (All Years)")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {availableYears.map((y) => {
                    const yStr = y.toString();
                    const isSelected = activeYears.includes(yStr);
                    return (
                      <DropdownMenuItem
                        key={yStr}
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleFilter("year", yStr);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                          isSelected &&
                            "bg-primary/10 font-semibold text-primary",
                        )}
                      >
                        <span>{yStr}</span>
                        {isSelected && <Lucide.Check className="size-3.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Multi-Sort Dropdown */}
          <div className="col-span-2 xl:col-span-1 flex items-center gap-1.5 xl:border-l xl:border-border/40 xl:pl-2 xl:ml-1 w-full xl:w-auto">
            <span
              className="text-[10px] font-semibold text-muted-foreground/80 hidden sm:inline uppercase tracking-wider shrink-0"
              suppressHydrationWarning
            >
              {t("aquila.sort", "Sort")}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center justify-between gap-1.5 h-9.5 px-3 w-full xl:w-auto xl:min-w-32 bg-background/40 hover:bg-background/60 border border-border/40 text-xs rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                    activeSorts.length > 0 &&
                      !(
                        activeSorts.length === 1 &&
                        activeSorts[0] === "last_updated"
                      ) &&
                      "border-primary/50 text-foreground font-medium bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Lucide.ArrowUpDown className="size-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate" suppressHydrationWarning>
                      {getSortTriggerLabel()}
                    </span>
                  </div>
                  <Lucide.ChevronDown className="size-3.5 opacity-50 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50"
              >
                <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  {t("aquila.multiSortTitle", "Sort Priority")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((opt) => {
                  const priorityIndex = activeSorts.indexOf(
                    opt.value as UserListSortType,
                  );
                  const isSelected = priorityIndex !== -1;
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleSort(opt.value as UserListSortType);
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-xl cursor-pointer transition-colors",
                        isSelected &&
                          "bg-primary/10 font-semibold text-primary",
                      )}
                    >
                      <span suppressHydrationWarning>
                        {getSortLabel(opt.value, opt.label)}
                      </span>
                      {isSelected && (
                        <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-xs">
                          {priorityIndex + 1}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
                {activeSorts.length > 0 &&
                  !(
                    activeSorts.length === 1 &&
                    activeSorts[0] === "last_updated"
                  ) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSort(["last_updated"])}
                        className="text-xs text-muted-foreground hover:text-foreground justify-center py-2 cursor-pointer rounded-xl"
                      >
                        <Lucide.RotateCcw className="size-3 mr-1.5" />
                        {t("aquila.resetSort", "Reset Sort")}
                      </DropdownMenuItem>
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reset Filters Button (Desktop) */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="hidden xl:inline-flex size-9.5 rounded-xl hover:bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
              title={t("aquila.resetAllFilters", "Reset all filters")}
            >
              <Lucide.RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Multi-Filter & Sort Sequence Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/20 animate-in fade-in duration-200">
          <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Lucide.Filter className="size-3" />
            {t("aquila.activeFilters", "Active:")}
          </span>

          {/* Format Chips */}
          {activeFormats.map((f) => (
            <div
              key={`format-${f}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[10px] opacity-70">
                {t("aquila.format", "Format")}:
              </span>
              <span>{getFormatLabel(f)}</span>
              <button
                type="button"
                onClick={() => handleToggleFilter("format", f)}
                className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Remove format filter"
              >
                <Lucide.X className="size-3" />
              </button>
            </div>
          ))}

          {/* Status Chips */}
          {activeStatuses.map((s) => (
            <div
              key={`status-${s}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[10px] opacity-70">
                {t("aquila.status", "Status")}:
              </span>
              <span>{getMediaStatusLabel(s)}</span>
              <button
                type="button"
                onClick={() => handleToggleFilter("mediaStatus", s)}
                className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Remove status filter"
              >
                <Lucide.X className="size-3" />
              </button>
            </div>
          ))}

          {/* Genre Chips */}
          {activeGenres.map((g) => (
            <div
              key={`genre-${g}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[10px] opacity-70">
                {t("aquila.genre", "Genre")}:
              </span>
              <span>{g}</span>
              <button
                type="button"
                onClick={() => handleToggleFilter("genres", g)}
                className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Remove genre filter"
              >
                <Lucide.X className="size-3" />
              </button>
            </div>
          ))}

          {/* Year Chips */}
          {activeYears.map((y) => (
            <div
              key={`year-${y}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="text-[10px] opacity-70">
                {t("aquila.year", "Year")}:
              </span>
              <span>{y}</span>
              <button
                type="button"
                onClick={() => handleToggleFilter("year", y)}
                className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Remove year filter"
              >
                <Lucide.X className="size-3" />
              </button>
            </div>
          ))}

          {/* Sort Chips */}
          {activeSorts.length > 0 &&
            !(activeSorts.length === 1 && activeSorts[0] === "last_updated") &&
            activeSorts.map((sortKey, idx) => {
              const opt = sortOptions.find((o) => o.value === sortKey);
              const label = getSortLabel(sortKey, opt?.label ?? sortKey);
              return (
                <div
                  key={`sort-${sortKey}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/25 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] font-bold opacity-75">
                    #{idx + 1}
                  </span>
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSort(sortKey)}
                    className="hover:bg-primary/25 rounded p-0.5 transition-colors cursor-pointer text-primary/70 hover:text-primary"
                    title="Remove sort criterion"
                  >
                    <Lucide.X className="size-3" />
                  </button>
                </div>
              );
            })}

          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 cursor-pointer transition-colors"
          >
            {t("aquila.clearSort", "Reset All")}
          </button>
        </div>
      )}
    </div>
  );
}

