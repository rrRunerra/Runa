"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Compass, Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import useSWR from "swr";
import { motion, Variants } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { RrBrowseCard } from "@/components/rrComponents/aquila/rrBrowseCard";
import { InfiniteScroll } from "@/components/aquila/media-list/InfiniteScroll";
import RrLapplandDiscover from "@/components/rrComponents/rrImages/rrLapplandDiscover";
import RrLapplandDiscoverNotFound from "@/components/rrComponents/rrImages/rrLapplandDiscoverNotFound";
import RrLapplandLayingLeft from "@/components/rrComponents/rrImages/rrLapplandLayingLeft";
import { useTranslation } from "react-i18next";

interface DiscoverClientPageProps {
  type: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export default function DiscoverClientPage({
  type,
}: DiscoverClientPageProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [year, setYear] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("latest");
  const [addedWithin, setAddedWithin] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  const [accumulatedItems, setAccumulatedItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Reset page parameters and loaded items when active category changes
  useEffect(() => {
    setAccumulatedItems([]);
    setPage(1);

    // Pull settings from url search params on mount or category change
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("q") || "");
    setDebouncedSearch(params.get("q") || "");
    setYear(params.get("year") || "all");
    setFormat(params.get("format") || "all");
    setStatus(params.get("status") || "all");
    setSort(params.get("sort") || "latest");
    setAddedWithin(params.get("addedWithin") || "all");
  }, [type]);

  // Synchronize dynamic parameters into URL parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    if (debouncedSearch.trim()) {
      url.searchParams.set("q", debouncedSearch);
    } else {
      url.searchParams.delete("q");
    }

    if (year !== "all") {
      url.searchParams.set("year", year);
    } else {
      url.searchParams.delete("year");
    }

    if (format !== "all") {
      url.searchParams.set("format", format);
    } else {
      url.searchParams.delete("format");
    }

    if (status !== "all") {
      url.searchParams.set("status", status);
    } else {
      url.searchParams.delete("status");
    }

    if (sort !== "latest") {
      url.searchParams.set("sort", sort);
    } else {
      url.searchParams.delete("sort");
    }

    if (addedWithin !== "all") {
      url.searchParams.set("addedWithin", addedWithin);
    } else {
      url.searchParams.delete("addedWithin");
    }

    window.history.replaceState(null, "", url.pathname + url.search);
  }, [debouncedSearch, year, format, status, sort, addedWithin]);

  // Debounce the search text input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // SWR query for filters metadata (available years, formats, statuses)
  const metaUrl = `${process.env.NEXT_PUBLIC_API_URL}/discover/meta/${type}`;
  const { data: meta } = useSWR<any>(metaUrl, fetcher);

  // SWR query for paginated discover results
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", "30");
  if (year !== "all") queryParams.set("year", year);
  if (format !== "all") queryParams.set("format", format);
  if (status !== "all") queryParams.set("status", status);
  if (debouncedSearch.trim()) queryParams.set("search", debouncedSearch);
  if (sort !== "latest") queryParams.set("sort", sort);
  if (addedWithin !== "all") queryParams.set("addedWithin", addedWithin);

  const discoverUrl = `${process.env.NEXT_PUBLIC_API_URL}/discover/${type}?${queryParams.toString()}`;
  const { data, error, isLoading } = useSWR<any>(discoverUrl, fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (error) {
      console.error("Discover API fetch error:", error);
    }
  }, [error]);

  // Handle accumulative pagination logic
  useEffect(() => {
    if (data) {
      setTotalCount(data.metadata.totalCount);
      setHasMore(data.metadata.hasMore);

      setAccumulatedItems((prev) => {
        if (page === 1) {
          return data.items;
        }
        // Deduplicate elements to avoid React key collisions
        const existingIds = new Set(prev.map((i) => i.id));
        const newItems = data.items.filter(
          (item: any) => !existingIds.has(item.id),
        );
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const handleYearChange = (val: string): void => {
    setYear(val);
    setPage(1);
  };

  const handleFormatChange = (val: string): void => {
    setFormat(val);
    setPage(1);
  };

  const handleStatusChange = (val: string): void => {
    setStatus(val);
    setPage(1);
  };

  const handleSortChange = (val: string): void => {
    setSort(val);
    setPage(1);
  };

  const handleAddedWithinChange = (val: string): void => {
    setAddedWithin(val);
    setPage(1);
  };

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading]);

  const clearFilters = (): void => {
    setSearch("");
    setYear("all");
    setFormat("all");
    setStatus("all");
    setSort("latest");
    setAddedWithin("all");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    year !== "all" ||
    format !== "all" ||
    status !== "all" ||
    sort !== "latest" ||
    addedWithin !== "all";

  const isNotFound = !isLoading && !error && accumulatedItems.length === 0;
  const Wallpaper = isNotFound
    ? RrLapplandDiscoverNotFound
    : RrLapplandDiscover;

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] =
    useState<boolean>(false);

  const activeFilterCount =
    (year !== "all" ? 1 : 0) +
    (format !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (sort !== "latest" ? 1 : 0) +
    (addedWithin !== "all" ? 1 : 0);

  return (
    <div className="relative w-full p-4 md:p-6 lg:p-8 flex flex-col gap-4 min-h-full">
      <div className="relative z-10 flex flex-col gap-4">
        {/* Header row */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <Compass className="size-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
                {t("aquila.discover")}
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Filter Controls Panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative p-3.5 sm:p-5 rounded-2xl bg-card border border-border/40 flex flex-col gap-3 sm:gap-4 shadow-sm overflow-hidden"
        >
          {/* Lappland peeking from the right side of the filters */}
          <RrLapplandLayingLeft className="absolute right-0 bottom-0 w-45 sm:w-50 md:w-70 h-auto text-foreground opacity-[0.15] dark:opacity-[0.08] pointer-events-none select-none z-0" />

          <div className="flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>{t("aquila.searchFilters")}</span>
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] font-bold rounded-full"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer rounded-lg px-2 sm:hidden"
              >
                {t("aquila.clearFilters")}
              </Button>
            )}
          </div>

          {/* Search Row + Mobile Filter Toggle Button */}
          <div className="flex items-center gap-2 z-10">
            {/* Search query input */}
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
              <Input
                placeholder={
                  ["characters", "actors"].includes(type)
                    ? t("aquila.searchNamesPlaceholderShort")
                    : t("aquila.searchTitlesPlaceholderShort")
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-primary rounded-xl text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground size-4 flex items-center justify-center cursor-pointer"
                >
                  <X className="size-3" />
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
                "sm:hidden h-10 px-3 rounded-xl gap-1.5 shrink-0 font-medium text-xs border-border/60 transition-all cursor-pointer",
                activeFilterCount > 0 &&
                  "border-primary/50 text-primary bg-primary/10",
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>{t("aquila.searchFilters")}</span>
              {activeFilterCount > 0 && (
                <span className="size-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Dropdowns Grid */}
          <div
            className={cn(
              "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 z-10",
              !isMobileFiltersOpen && "hidden sm:flex",
            )}
          >
            {/* Year dynamic dropdown */}
            {meta?.years &&
              meta.years.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <Select value={year} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-32.5 text-xs sm:text-sm">
                    <SelectValue placeholder={t("aquila.yearAll")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" position="popper">
                    <SelectItem value="all">{t("aquila.yearAll")}</SelectItem>
                    {meta.years.map((y: number) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

            {/* Format dynamic dropdown (only anime/manga) */}
            {meta?.formats &&
              meta.formats.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <Select value={format} onValueChange={handleFormatChange}>
                  <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-35 text-xs sm:text-sm">
                    <SelectValue placeholder={t("aquila.formatAll")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" position="popper">
                    <SelectItem value="all">{t("aquila.formatAll")}</SelectItem>
                    {meta.formats.map((f: string) => (
                      <SelectItem key={f} value={f}>
                        {t(`aquila.formats.${f.toUpperCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

            {/* Status dynamic dropdown (only media with statuses) */}
            {meta?.statuses &&
              meta.statuses.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-35 text-xs sm:text-sm">
                    <SelectValue placeholder={t("aquila.statusAll")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" position="popper">
                    <SelectItem value="all">{t("aquila.statusAll")}</SelectItem>
                    {meta.statuses.map((s: string) => (
                      <SelectItem key={s} value={s}>
                        {t(`aquila.statuses.${s.toUpperCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

            {/* Added date filter dropdown */}
            {!["characters", "actors"].includes(type) && (
              <Select
                value={addedWithin}
                onValueChange={handleAddedWithinChange}
              >
                <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder={t("aquila.addedTime")} />
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">
                    {t("aquila.addedAnytime")}
                  </SelectItem>
                  <SelectItem value="1">{t("aquila.added1DayAgo")}</SelectItem>
                  <SelectItem value="7">{t("aquila.added7DaysAgo")}</SelectItem>
                  <SelectItem value="30">
                    {t("aquila.added30DaysAgo")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Server-side sorting dropdown */}
            {!["characters", "actors"].includes(type) && (
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-40 text-xs sm:text-sm">
                  <SelectValue placeholder={t("aquila.sortBy")} />
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="latest">
                    {t("aquila.latestRelease")}
                  </SelectItem>
                  <SelectItem value="oldest">
                    {t("aquila.oldestRelease")}
                  </SelectItem>
                  {type !== "movies" && type !== "tv" && (
                    <SelectItem value="score">
                      {t("aquila.highestScore")}
                    </SelectItem>
                  )}
                  <SelectItem value="alphabetical">
                    {t("aquila.alphabetical")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground h-10 cursor-pointer rounded-lg px-3"
              >
                {t("aquila.clearFilters")}
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-100">
        {/* The watermark background sits behind */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute left-1/2 -translate-x-1/2 top-0 select-none z-0 pointer-events-none"
        >
          <Wallpaper className="w-137.5 h-137.5 md:w-212.5 md:h-212.5 text-foreground opacity-[0.05] dark:opacity-[0.03]" />
        </motion.div>
        {/* Grid of Results */}
        {accumulatedItems.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6"
          >
            {accumulatedItems.map((item) => (
              <motion.div
                key={item.id}
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1 },
                }}
              >
                <RrBrowseCard item={item} type={type} />
              </motion.div>
            ))}
          </motion.div>
        ) : null}

        {/* Initial load spinner */}
        {isLoading && page === 1 && (
          <div className="flex flex-col justify-center items-center py-20 w-full gap-2">
            <Loader2 className="animate-spin size-8 text-primary" />
            <span className="text-sm text-muted-foreground font-semibold">
              {t("aquila.loadingMediaDb", "Loading media database...")}
            </span>
          </div>
        )}

        {/* Infinite Scroll container */}
        <InfiniteScroll
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
