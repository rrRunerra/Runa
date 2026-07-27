"use client";

import React from "react";
import RrLapplandLayingRight from "@/components/rrComponents/rrImages/rrLapplandLayingRight";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { fetcher } from "@/lib/fetcher";
import * as Lucide from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface RrUserListFilterState {
  format?: string;
  genres?: string[];
  year?: string;
  mediaStatus?: string;
}

export type UserListSortType =
  "title" | "score" | "progress" | "last_updated" | "last_added";

export interface RrUserListFiltersProps {
  username: string;
  mediaType: string;
  searchVal: string;
  setSearchVal: (val: string) => void;
  sort: UserListSortType;
  setSort: (val: UserListSortType) => void;
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

  const handleFilterChange = (
    key: keyof RrUserListFilterState,
    value: string,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]:
        key === "genres"
          ? value && value !== "all"
            ? [value]
            : []
          : value === "all"
            ? ""
            : value,
    }));
  };

  const hasActiveFilters =
    searchVal !== "" ||
    filters.format ||
    (Array.isArray(filters.genres) && filters.genres.length > 0) ||
    filters.year ||
    filters.mediaStatus ||
    sort !== "last_updated";

  const handleReset = () => {
    setSearchVal("");
    setSort("last_updated");
    setFilters({
      format: "",
      genres: [],
      year: "",
      mediaStatus: "",
    });
  };

  const activeGenre = Array.isArray(filters.genres) ? filters.genres[0] || "" : "";
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t("aquila.searchPlaceholder");

  // Helpers for label translations
  const getSortLabel = (val: string, fallbackLabel: string) => {
    switch (val) {
      case "title":
        return t("aquila.sortTitle");
      case "score":
        return t("aquila.sortScore");
      case "progress":
        return t("aquila.sortProgress");
      case "last_updated":
        return t("aquila.sortLastUpdated");
      case "last_added":
        return t("aquila.sortLastAdded");
      default:
        return fallbackLabel;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format.toUpperCase().replace(/\s+/g, "_")) {
      case "MOVIE":
        return t("aquila.formatMovie");
      case "TV":
        return t("aquila.formatTV");
      case "TV_SHORT":
        return t("aquila.formatTVShort");
      case "SPECIAL":
        return t("aquila.formatSpecial");
      case "OVA":
        return t("aquila.formatOVA");
      case "ONA":
        return t("aquila.formatONA");
      case "MANGA":
        return t("aquila.formatManga");
      case "NOVEL":
        return t("aquila.formatNovel");
      case "ONE_SHOT":
        return t("aquila.formatOneShot");
      case "LIGHT_NOVEL":
        return t("aquila.formatLightNovel");
      case "DOUJINSHI":
        return t("aquila.formatDoujinshi");
      case "GAME":
        return t("aquila.formatGame");
      case "BOOK":
        return t("aquila.formatBook");
      case "UNKNOWN":
        return t("aquila.formatUnknown");
      default:
        return format.replace(/_/g, " ");
    }
  };

  const getMediaStatusLabel = (status: string) => {
    switch (status.toUpperCase().replace(/\s+/g, "_")) {
      case "FINISHED":
      case "ENDED":
        return t("aquila.statusFinished");
      case "RELEASING":
      case "CONTINUING":
        return t("aquila.statusReleasing");
      case "RELEASED":
        return t("aquila.statusReleased");
      case "NOT_YET_RELEASED":
      case "NOT YET RELEASED":
      case "UPCOMING":
        return t("aquila.statusNotYetReleased");
      case "CANCELLED":
        return t("aquila.statusCancelled");
      case "HIATUS":
        return t("aquila.statusHiatus");
      default:
        return status.replace(/_/g, " ");
    }
  };

  return (
    <div className="relative flex flex-col gap-4 w-full bg-card/20 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-xl select-none">
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
        {/* Left Side: Search bar */}
        <div className="relative flex-1 max-w-full xl:max-w-xs">
          <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
          <Input
            placeholder={resolvedSearchPlaceholder}
            suppressHydrationWarning
            className="pl-9 h-9.5 bg-background/40 border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-xl placeholder:text-muted-foreground/40 text-xs"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        {/* Lappland: fills the gap, pushed right to sit next to the filters */}
        <div className="hidden xl:flex flex-1 items-end justify-end pointer-events-none select-none">
          <RrLapplandLayingRight className="h-16 w-auto text-foreground/20" />
        </div>

        {/* Right Side: Row of Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format/Type Filter */}
          {availableFormats.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Select
                value={filters.format || "all"}
                onValueChange={(v) => handleFilterChange("format", v)}
              >
                <SelectTrigger className="h-9.5 min-w-25 bg-background/40 border border-border/40 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder={t("aquila.format")} />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/40 rounded-xl">
                  <SelectItem value="all">{t("aquila.allFormats")}</SelectItem>
                  {availableFormats.map((f) => (
                    <SelectItem key={f} value={f}>
                      {getFormatLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Media Release Status Filter */}
          {availableStatuses.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Select
                value={filters.mediaStatus || "all"}
                onValueChange={(v) => handleFilterChange("mediaStatus", v)}
              >
                <SelectTrigger className="h-9.5 min-w-25 bg-background/40 border border-border/40 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder={t("aquila.status")} />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/40 rounded-xl">
                  <SelectItem value="all">{t("aquila.allStatuses")}</SelectItem>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {getMediaStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Genres Filter */}
          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Select
                value={activeGenre || "all"}
                onValueChange={(v) => handleFilterChange("genres", v)}
              >
                <SelectTrigger className="h-9.5 min-w-27.5 bg-background/40 border border-border/40 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder={t("aquila.genre")} />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/40 rounded-xl max-h-60">
                  <SelectItem value="all">{t("aquila.allGenres")}</SelectItem>
                  {availableGenres.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Filter */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Select
                value={filters.year || "all"}
                onValueChange={(v) => handleFilterChange("year", v)}
              >
                <SelectTrigger className="h-9.5 min-w-22.5 bg-background/40 border border-border/40 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder={t("aquila.year")} />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/40 rounded-xl max-h-60">
                  <SelectItem value="all">{t("aquila.allYears")}</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 border-l border-border/40 pl-2 ml-1">
            <span
              className="text-[10px] font-semibold text-muted-foreground/80 hidden sm:inline uppercase tracking-wider"
              suppressHydrationWarning
            >
              {t("aquila.sort")}
            </span>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as UserListSortType)}
            >
              <SelectTrigger className="h-9.5 min-w-28.75 bg-background/40 border border-border/40 text-xs rounded-xl focus:ring-1 focus:ring-primary/30">
                <SelectValue placeholder={t("aquila.sortBy")} />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/40 rounded-xl">
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span suppressHydrationWarning>
                      {getSortLabel(opt.value, opt.label)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="size-9.5 rounded-xl hover:bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={t("aquila.resetAllFilters")}
            >
              <Lucide.RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
