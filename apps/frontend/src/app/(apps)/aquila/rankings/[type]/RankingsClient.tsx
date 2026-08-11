"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { RrRankingsHeader } from "@/components/rrComponents/aquila/rankings/RrRankingsHeader";
import { RrRankingsFilterBar } from "@/components/rrComponents/aquila/rankings/RrRankingsFilterBar";
import { RrRankingsListRow } from "@/components/rrComponents/aquila/rankings/RrRankingsListRow";
import { RrRankingsGridCard } from "@/components/rrComponents/aquila/rankings/RrRankingsGridCard";
import { RrRankingsSkeleton } from "@/components/rrComponents/aquila/rankings/RrRankingsSkeleton";
import RrLapplandDiscoverNotFound from "@/components/rrComponents/rrImages/rrLapplandDiscoverNotFound";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RankedMediaItem,
  RankingsMetaResponse,
  RankingsResponse,
} from "@/types/aquila";

interface RankingsClientProps {
  type: string;
}

const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export default function RankingsClient({
  type,
}: RankingsClientProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [source, setSource] = useState<string>("aquila");
  const [genre, setGenre] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [season, setSeason] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Normalize type for backend endpoint
  const mediaType =
    type === "movies"
      ? "movie"
      : type === "games"
        ? "game"
        : type === "books"
          ? "book"
          : type;

  // 1. Fetch Metadata for the current media category
  const metaUrl = `${process.env.NEXT_PUBLIC_API_URL}/rankings/meta/${mediaType}`;
  const { data: metaData } = useSWR<RankingsMetaResponse>(metaUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const sources = metaData?.sources || [
    { id: "aquila", name: "Aquila Average Score", maxScore: 100 },
  ];
  const genres = metaData?.genres || [];
  const years = metaData?.years || [];
  const seasons = metaData?.seasons || [];
  const formats = metaData?.formats || [];
  const statuses = metaData?.statuses || [];

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (source !== "aquila" && source !== "all") count++;
    if (genre !== "all" && genre.trim() !== "") count++;
    if (year !== "all" && year.trim() !== "") count++;
    if (season !== "all" && season.trim() !== "") count++;
    if (format !== "all" && format.trim() !== "") count++;
    if (status !== "all" && status.trim() !== "") count++;
    return count;
  }, [source, genre, year, season, format, status]);

  // 2. Load initial URL search params & local storage preferences on mount or type change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSource = params.get("source");
    const urlGenre = params.get("genre");
    const urlYear = params.get("year");
    const urlSeason = params.get("season");
    const urlFormat = params.get("format");
    const urlStatus = params.get("status");
    const urlView = params.get("view");
    const urlFiltersOpen = params.get("filters");

    if (urlSource) setSource(urlSource);
    else setSource("aquila");

    if (urlGenre) setGenre(urlGenre);
    else setGenre("all");

    if (urlYear) setYear(urlYear);
    else setYear("all");

    if (urlSeason) setSeason(urlSeason);
    else setSeason("all");

    if (urlFormat) setFormat(urlFormat);
    else setFormat("all");

    if (urlStatus) setStatus(urlStatus);
    else setStatus("all");

    if (urlFiltersOpen === "true") {
      setIsFiltersOpen(true);
    }

    if (urlView === "list" || urlView === "grid") {
      setViewMode(urlView);
    } else {
      const savedView = localStorage.getItem("aquila_rankings_view");
      if (savedView === "list" || savedView === "grid") {
        setViewMode(savedView);
      }
    }

    setIsLoaded(true);
  }, [type]);

  // 3. Save view mode preference to localStorage
  const handleViewModeChange = useCallback((mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("aquila_rankings_view", mode);
  }, []);

  // 4. Synchronize state with URL parameters
  useEffect(() => {
    if (!isLoaded) return;

    const url = new URL(window.location.href);
    if (source && source !== "aquila") url.searchParams.set("source", source);
    else url.searchParams.delete("source");

    if (genre && genre !== "all") url.searchParams.set("genre", genre);
    else url.searchParams.delete("genre");

    if (year && year !== "all") url.searchParams.set("year", year);
    else url.searchParams.delete("year");

    if (season && season !== "all") url.searchParams.set("season", season);
    else url.searchParams.delete("season");

    if (format && format !== "all") url.searchParams.set("format", format);
    else url.searchParams.delete("format");

    if (status && status !== "all") url.searchParams.set("status", status);
    else url.searchParams.delete("status");

    if (viewMode !== "list") url.searchParams.set("view", viewMode);
    else url.searchParams.delete("view");

    if (isFiltersOpen) url.searchParams.set("filters", "true");
    else url.searchParams.delete("filters");

    window.history.replaceState(null, "", url.pathname + url.search);
  }, [
    isLoaded,
    source,
    genre,
    year,
    season,
    format,
    status,
    viewMode,
    isFiltersOpen,
  ]);

  // 5. Build query string for API
  const queryParams = new URLSearchParams();
  queryParams.set("limit", "100");
  if (source && source !== "aquila") queryParams.set("source", source);
  if (genre && genre !== "all") queryParams.set("genres", genre);
  if (year && year !== "all") queryParams.set("year", year);
  if (season && season !== "all") queryParams.set("season", season);
  if (format && format !== "all") queryParams.set("format", format);
  if (status && status !== "all") queryParams.set("status", status);

  const rankingsUrl = `${process.env.NEXT_PUBLIC_API_URL}/rankings/${mediaType}?${queryParams.toString()}`;
  const { data, error, isLoading } = useSWR<RankingsResponse>(
    rankingsUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  const items = data?.items || [];
  const totalCount = data?.metadata?.totalCount || 0;

  const handleResetFilters = useCallback(() => {
    setSource("aquila");
    setGenre("all");
    setYear("all");
    setSeason("all");
    setFormat("all");
    setStatus("all");
  }, []);

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <RrRankingsHeader
        currentType={type}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
        activeFiltersCount={activeFiltersCount}
        totalCount={totalCount}
      />

      {/* Expandable Filter Bar */}
      <AnimatePresence initial={false}>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full"
          >
            <RrRankingsFilterBar
              sources={sources}
              genres={genres}
              years={years}
              seasons={seasons}
              formats={formats}
              statuses={statuses}
              selectedSource={source}
              selectedGenre={genre}
              selectedYear={year}
              selectedSeason={season}
              selectedFormat={format}
              selectedStatus={status}
              onSourceChange={setSource}
              onGenreChange={setGenre}
              onYearChange={setYear}
              onSeasonChange={setSeason}
              onFormatChange={setFormat}
              onStatusChange={setStatus}
              onResetFilters={handleResetFilters}
              onClose={() => setIsFiltersOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slim Active Filter Chips Bar (visible when filters are closed but active) */}
      {!isFiltersOpen && activeFiltersCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2.5 px-3.5 rounded-xl bg-card/40 border border-border/50 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="size-3 text-primary" />
              <span>Active filters:</span>
            </span>

            {source !== "aquila" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setSource("aquila")}
              >
                <span>
                  {sources.find((s) => s.id === source)?.name || source}
                </span>
                <X className="size-2.5" />
              </Badge>
            )}

            {genre !== "all" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setGenre("all")}
              >
                <span>{genre}</span>
                <X className="size-2.5" />
              </Badge>
            )}

            {year !== "all" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setYear("all")}
              >
                <span>{year}</span>
                <X className="size-2.5" />
              </Badge>
            )}

            {season !== "all" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setSeason("all")}
              >
                <span>{season}</span>
                <X className="size-2.5" />
              </Badge>
            )}

            {format !== "all" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setFormat("all")}
              >
                <span>{format.replace(/_/g, " ")}</span>
                <X className="size-2.5" />
              </Badge>
            )}

            {status !== "all" && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-2 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
                onClick={() => setStatus("all")}
              >
                <span>{status.replace(/_/g, " ")}</span>
                <X className="size-2.5" />
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFiltersOpen(true)}
              className="h-6 px-2 text-[11px] text-primary hover:text-primary/80 gap-1 rounded-md"
            >
              <SlidersHorizontal className="size-3" />
              <span>Edit Filters</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1 rounded-md"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      )}

      {/* Content Body: Loading, Results, or Empty State */}
      {isLoading ? (
        <RrRankingsSkeleton viewMode={viewMode} count={12} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-card/30 border border-border/40 gap-4 min-h-90">
          <div className="relative size-40 sm:size-48 opacity-90">
            <RrLapplandDiscoverNotFound className="size-full object-contain" />
          </div>
          <div className="flex flex-col items-center gap-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {t("aquila.rankings.noResults")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Try adjusting or clearing some filters to see the top 100 ranked
              media.
            </p>
          </div>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            size="sm"
            className="rounded-xl mt-2 text-xs font-medium"
          >
            {t("aquila.rankings.resetFilters")}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 w-full"
        >
          {items.map((item, idx) => (
            <RrRankingsGridCard
              key={`${item.id}-${item.rank}`}
              item={item}
              type={type}
              index={idx}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-2.5 w-full"
        >
          {items.map((item, idx) => (
            <RrRankingsListRow
              key={`${item.id}-${item.rank}`}
              item={item}
              type={type}
              index={idx}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
