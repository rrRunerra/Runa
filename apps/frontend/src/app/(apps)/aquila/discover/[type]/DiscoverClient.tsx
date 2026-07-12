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

interface DiscoverClientPageProps {
  type: string;
}

const categories = [
  { id: "anime", label: "Anime" },
  { id: "manga", label: "Manga" },
  { id: "movies", label: "Movies" },
  { id: "tv", label: "TV Shows" },
  { id: "games", label: "Games" },
  { id: "books", label: "Books" },
];

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
  const Wallpaper = isNotFound ? RrLapplandDiscoverNotFound : RrLapplandDiscover;

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
              <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
                Discover
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Filter Controls Panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative p-5 rounded-2xl bg-card border border-border/40 flex flex-col gap-4 shadow-sm overflow-hidden"
        >
          {/* Lappland peeking from the right side of the filters */}
          <RrLapplandLayingLeft className="absolute right-0 bottom-0 w-[200px] md:w-[280px] h-auto text-foreground opacity-[0.15] dark:opacity-[0.08] pointer-events-none select-none z-0" />
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground/95 mb-1">
            <SlidersHorizontal className="size-4 text-primary" />
            <span>Search Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search query input */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
              <Input
                placeholder="Search titles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-background/50 border-border/60 focus-visible:ring-primary rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground size-4 flex items-center justify-center cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Year dynamic dropdown */}
            <Select value={year} onValueChange={handleYearChange}>
              <SelectTrigger className="h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-[130px]">
                <SelectValue placeholder="Year (All)" />
              </SelectTrigger>
              <SelectContent className="max-h-60" position="popper">
                <SelectItem value="all">Year (All)</SelectItem>
                {meta?.years?.map((y: number) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Format dynamic dropdown (only anime/manga) */}
            {meta?.formats && meta.formats.length > 0 && (
              <Select value={format} onValueChange={handleFormatChange}>
                <SelectTrigger className="h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-[140px]">
                  <SelectValue placeholder="Format (All)" />
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">Format (All)</SelectItem>
                  {meta.formats.map((f: string) => (
                    <SelectItem key={f} value={f}>
                      {f.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status dynamic dropdown (only media with statuses) */}
            {meta?.statuses && meta.statuses.length > 0 && (
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-[140px]">
                  <SelectValue placeholder="Status (All)" />
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">Status (All)</SelectItem>
                  {meta.statuses.map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s
                        .toLowerCase()
                        .replace("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Added date filter dropdown */}
            <Select value={addedWithin} onValueChange={handleAddedWithinChange}>
              <SelectTrigger className="h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-[160px]">
                <SelectValue placeholder="Added Time" />
              </SelectTrigger>
              <SelectContent className="max-h-60" position="popper">
                <SelectItem value="all">Added (Anytime)</SelectItem>
                <SelectItem value="1">Added 1 day ago</SelectItem>
                <SelectItem value="7">Added 7 days ago</SelectItem>
                <SelectItem value="30">Added 30 days ago</SelectItem>
              </SelectContent>
            </Select>

            {/* Server-side sorting dropdown */}
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-[160px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="max-h-60" position="popper">
                <SelectItem value="latest">Latest Release</SelectItem>
                <SelectItem value="oldest">Oldest Release</SelectItem>
                {type !== "movies" && type !== "tv" && (
                  <SelectItem value="score">Highest Score</SelectItem>
                )}
                <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-10 cursor-pointer rounded-lg px-3"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-[400px]">
        {/* The watermark background sits behind */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute left-1/2 -translate-x-1/2 top-0 select-none z-0 pointer-events-none"
        >
          <Wallpaper className="w-[550px] h-[550px] md:w-[850px] md:h-[850px] text-foreground opacity-[0.05] dark:opacity-[0.03]" />
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
            Loading media database...
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
