"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  SlidersHorizontal,
  Loader2,
  X,
  Check,
  ChevronDown,
  RotateCcw,
  Filter,
  ArrowUpDown,
  Globe,
  Building2,
  ShieldAlert,
  Hash,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

const COUNTRY_NAMES: Record<string, string> = {
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  US: "United States",
  GB: "United Kingdom",
  FR: "France",
  CA: "Canada",
  DE: "Germany",
  TW: "Taiwan",
  IT: "Italy",
  ES: "Spain",
  AU: "Australia",
};

export default function DiscoverClientPage({
  type,
}: DiscoverClientPageProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [years, setYears] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [studios, setStudios] = useState<string[]>([]);
  const [isAdult, setIsAdult] = useState<string>("all");
  const [episodesRange, setEpisodesRange] = useState<string>("all");
  const [sorts, setSorts] = useState<string[]>(["latest"]);
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

    const yearParam = params.get("year");
    setYears(
      yearParam && yearParam !== "all"
        ? yearParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    const formatParam = params.get("format");
    setFormats(
      formatParam && formatParam !== "all"
        ? formatParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    const statusParam = params.get("status");
    setStatuses(
      statusParam && statusParam !== "all"
        ? statusParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    const genresParam = params.get("genres");
    setGenres(
      genresParam && genresParam !== "all"
        ? genresParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    const countriesParam = params.get("country");
    setCountries(
      countriesParam && countriesParam !== "all"
        ? countriesParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    const studiosParam = params.get("studio");
    setStudios(
      studiosParam && studiosParam !== "all"
        ? studiosParam.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    );

    setIsAdult(params.get("adult") || "all");
    setEpisodesRange(params.get("episodes") || "all");

    const sortParam = params.get("sort");
    setSorts(
      sortParam && sortParam !== "latest"
        ? sortParam.split(",").map((s) => s.trim()).filter(Boolean)
        : ["latest"],
    );

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

    if (years.length > 0) {
      url.searchParams.set("year", years.join(","));
    } else {
      url.searchParams.delete("year");
    }

    if (formats.length > 0) {
      url.searchParams.set("format", formats.join(","));
    } else {
      url.searchParams.delete("format");
    }

    if (statuses.length > 0) {
      url.searchParams.set("status", statuses.join(","));
    } else {
      url.searchParams.delete("status");
    }

    if (genres.length > 0) {
      url.searchParams.set("genres", genres.join(","));
    } else {
      url.searchParams.delete("genres");
    }

    if (countries.length > 0) {
      url.searchParams.set("country", countries.join(","));
    } else {
      url.searchParams.delete("country");
    }

    if (studios.length > 0) {
      url.searchParams.set("studio", studios.join(","));
    } else {
      url.searchParams.delete("studio");
    }

    if (isAdult !== "all") {
      url.searchParams.set("adult", isAdult);
    } else {
      url.searchParams.delete("adult");
    }

    if (episodesRange !== "all") {
      url.searchParams.set("episodes", episodesRange);
    } else {
      url.searchParams.delete("episodes");
    }

    if (sorts.length > 0 && !(sorts.length === 1 && sorts[0] === "latest")) {
      url.searchParams.set("sort", sorts.join(","));
    } else {
      url.searchParams.delete("sort");
    }

    if (addedWithin !== "all") {
      url.searchParams.set("addedWithin", addedWithin);
    } else {
      url.searchParams.delete("addedWithin");
    }

    window.history.replaceState(null, "", url.pathname + url.search);
  }, [
    debouncedSearch,
    years,
    formats,
    statuses,
    genres,
    countries,
    studios,
    isAdult,
    episodesRange,
    sorts,
    addedWithin,
  ]);

  // Debounce the search text input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // SWR query for filters metadata (available years, formats, statuses, genres, countries, studios)
  const metaUrl = `${process.env.NEXT_PUBLIC_API_URL}/discover/meta/${type}`;
  const { data: meta } = useSWR<any>(metaUrl, fetcher);

  // Parse episode range into min/max query parameters
  const [minEpisodes, maxEpisodes] = useMemo(() => {
    if (!episodesRange || episodesRange === "all") return ["", ""];
    if (episodesRange === "100+") return ["100", ""];
    const parts = episodesRange.split("-");
    return [parts[0] || "", parts[1] || ""];
  }, [episodesRange]);

  // SWR query for paginated discover results
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("limit", "30");
  if (years.length > 0) queryParams.set("year", years.join(","));
  if (formats.length > 0) queryParams.set("format", formats.join(","));
  if (statuses.length > 0) queryParams.set("status", statuses.join(","));
  if (genres.length > 0) queryParams.set("genres", genres.join(","));
  if (countries.length > 0) queryParams.set("countryOfOrigin", countries.join(","));
  if (studios.length > 0) queryParams.set("studio", studios.join(","));
  if (isAdult !== "all") queryParams.set("isAdult", isAdult === "adult" ? "true" : "false");
  if (minEpisodes) queryParams.set("minEpisodes", minEpisodes);
  if (maxEpisodes) queryParams.set("maxEpisodes", maxEpisodes);
  if (debouncedSearch.trim()) queryParams.set("search", debouncedSearch);
  if (sorts.length > 0 && !(sorts.length === 1 && sorts[0] === "latest")) {
    queryParams.set("sort", sorts.join(","));
  }
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

  const handleToggleYear = (y: string): void => {
    setYears((prev) =>
      prev.includes(y) ? prev.filter((item) => item !== y) : [...prev, y],
    );
    setPage(1);
  };

  const handleClearYears = (): void => {
    setYears([]);
    setPage(1);
  };

  const handleToggleFormat = (f: string): void => {
    setFormats((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f],
    );
    setPage(1);
  };

  const handleClearFormats = (): void => {
    setFormats([]);
    setPage(1);
  };

  const handleToggleStatus = (s: string): void => {
    setStatuses((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s],
    );
    setPage(1);
  };

  const handleClearStatuses = (): void => {
    setStatuses([]);
    setPage(1);
  };

  const handleToggleGenre = (g: string): void => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g],
    );
    setPage(1);
  };

  const handleClearGenres = (): void => {
    setGenres([]);
    setPage(1);
  };

  const handleToggleCountry = (c: string): void => {
    setCountries((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c],
    );
    setPage(1);
  };

  const handleClearCountries = (): void => {
    setCountries([]);
    setPage(1);
  };

  const handleToggleStudio = (s: string): void => {
    setStudios((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s],
    );
    setPage(1);
  };

  const handleClearStudios = (): void => {
    setStudios([]);
    setPage(1);
  };

  const handleToggleSort = (s: string): void => {
    setSorts((prev) => {
      const isPresent = prev.includes(s);
      if (isPresent) {
        if (prev.length === 1 && prev[0] === s) {
          return ["latest"];
        }
        const next = prev.filter((item) => item !== s);
        return next.length > 0 ? next : ["latest"];
      } else {
        if (prev.length === 1 && prev[0] === "latest") {
          return [s];
        }
        return [...prev, s];
      }
    });
    setPage(1);
  };

  const handleRemoveSort = (s: string): void => {
    setSorts((prev) => {
      const next = prev.filter((item) => item !== s);
      return next.length > 0 ? next : ["latest"];
    });
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
    setYears([]);
    setFormats([]);
    setStatuses([]);
    setGenres([]);
    setCountries([]);
    setStudios([]);
    setIsAdult("all");
    setEpisodesRange("all");
    setSorts(["latest"]);
    setAddedWithin("all");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    years.length > 0 ||
    formats.length > 0 ||
    statuses.length > 0 ||
    genres.length > 0 ||
    countries.length > 0 ||
    studios.length > 0 ||
    isAdult !== "all" ||
    episodesRange !== "all" ||
    sorts.length > 1 ||
    (sorts.length === 1 && sorts[0] !== "latest") ||
    addedWithin !== "all";

  const isNotFound = !isLoading && !error && accumulatedItems.length === 0;
  const Wallpaper = isNotFound
    ? RrLapplandDiscoverNotFound
    : RrLapplandDiscover;

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] =
    useState<boolean>(false);

  const activeFilterCount =
    years.length +
    formats.length +
    statuses.length +
    genres.length +
    countries.length +
    studios.length +
    (isAdult !== "all" ? 1 : 0) +
    (episodesRange !== "all" ? 1 : 0) +
    (sorts.length > 1 || (sorts.length === 1 && sorts[0] !== "latest") ? 1 : 0) +
    (addedWithin !== "all" ? 1 : 0);

  // Label helpers
  const getFormatLabel = (formatStr: string) => {
    switch (formatStr.toUpperCase().replace(/\s+/g, "_")) {
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
      default:
        return formatStr.replace(/_/g, " ");
    }
  };

  const getStatusLabel = (statusStr: string) => {
    switch (statusStr.toUpperCase().replace(/\s+/g, "_")) {
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
        return statusStr.replace(/_/g, " ");
    }
  };

  const getCountryLabel = (countryCode: string) => {
    return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
  };

  const getStudioFilterLabel = () => {
    if (type === "game") return t("aquila.devPublisher", "Developer / Publisher");
    if (type === "tv") return t("aquila.networkStudio", "Network / Studio");
    if (type === "book") return t("aquila.publisherAuthor", "Publisher / Author");
    if (type === "manga") return t("aquila.publisher", "Publisher");
    return t("aquila.studio", "Studio");
  };

  const getSortLabel = (sortStr: string) => {
    switch (sortStr) {
      case "latest":
        return t("aquila.latestRelease", "Latest Release");
      case "oldest":
        return t("aquila.oldestRelease", "Oldest Release");
      case "score":
        return t("aquila.highestScore", "Highest Score");
      case "episodes":
        return t("aquila.mostEpisodes", "Most Episodes");
      case "seasons":
        return t("aquila.mostSeasons", "Most Seasons");
      case "chapters":
        return t("aquila.mostChapters", "Most Chapters");
      case "volumes":
        return t("aquila.mostVolumes", "Most Volumes");
      case "pages":
        return t("aquila.mostPages", "Most Pages");
      case "alphabetical":
        return t("aquila.alphabetical", "Alphabetical");
      case "recently_added":
        return t("aquila.sortLastAdded", "Recently Added");
      default:
        return sortStr;
    }
  };

  const getSortTriggerLabel = () => {
    if (
      sorts.length === 0 ||
      (sorts.length === 1 && sorts[0] === "latest")
    ) {
      return t("aquila.latestRelease", "Latest Release");
    }
    const firstLabel = getSortLabel(sorts[0]);
    if (sorts.length === 1) return firstLabel;
    return `${firstLabel} (+${sorts.length - 1})`;
  };

  const sortOptions = useMemo(() => {
    const opts = [
      { value: "latest", label: t("aquila.latestRelease", "Latest Release") },
      { value: "oldest", label: t("aquila.oldestRelease", "Oldest Release") },
    ];

    if (type !== "movies" && type !== "tv") {
      opts.push({ value: "score", label: t("aquila.highestScore", "Highest Score") });
    }

    if (type === "anime" || type === "tv") {
      opts.push({ value: "episodes", label: t("aquila.mostEpisodes", "Most Episodes") });
    }

    if (type === "tv") {
      opts.push({ value: "seasons", label: t("aquila.mostSeasons", "Most Seasons") });
    }

    if (type === "manga" || type === "books") {
      opts.push({ value: "chapters", label: t("aquila.mostChapters", "Most Chapters") });
      opts.push({ value: "volumes", label: t("aquila.mostVolumes", "Most Volumes") });
    }

    if (type === "books") {
      opts.push({ value: "pages", label: t("aquila.mostPages", "Most Pages") });
    }

    opts.push(
      { value: "alphabetical", label: t("aquila.alphabetical", "Alphabetical") },
      { value: "recently_added", label: t("aquila.sortLastAdded", "Recently Added") },
    );

    return opts;
  }, [type, t]);

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
              <span>{t("aquila.searchFilters", "Filters")}</span>
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
                {t("aquila.clearFilters", "Clear")}
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
                    ? t("aquila.searchNamesPlaceholderShort", "Search names...")
                    : t("aquila.searchTitlesPlaceholderShort", "Search titles...")
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
              <span>{t("aquila.searchFilters", "Filters")}</span>
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
            {/* Year multi-select dropdown */}
            {meta?.years &&
              meta.years.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-28 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        years.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <span className="truncate">
                        {years.length === 0
                          ? t("aquila.yearAll", "All Years")
                          : years.length === 1
                            ? years[0]
                            : `${years[0]} (+${years.length - 1})`}
                      </span>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-44 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.year", "Year")}
                    </DropdownMenuLabel>
                    {years.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearYears();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.allYears", "Clear (All Years)")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.years.map((y: number) => {
                      const yStr = y.toString();
                      const isSelected = years.includes(yStr);
                      return (
                        <DropdownMenuItem
                          key={yStr}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleYear(yStr);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{yStr}</span>
                          {isSelected && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Format multi-select dropdown */}
            {meta?.formats &&
              meta.formats.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-32 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        formats.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <span className="truncate">
                        {formats.length === 0
                          ? t("aquila.formatAll", "All Formats")
                          : formats.length === 1
                            ? getFormatLabel(formats[0])
                            : `${getFormatLabel(formats[0])} (+${formats.length - 1})`}
                      </span>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-48 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.format", "Format")}
                    </DropdownMenuLabel>
                    {formats.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearFormats();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.allFormats", "Clear (All Formats)")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.formats.map((f: string) => {
                      const isSelected = formats.includes(f);
                      return (
                        <DropdownMenuItem
                          key={f}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleFormat(f);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{getFormatLabel(f)}</span>
                          {isSelected && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Status multi-select dropdown */}
            {meta?.statuses &&
              meta.statuses.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-32 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        statuses.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <span className="truncate">
                        {statuses.length === 0
                          ? t("aquila.statusAll", "All Statuses")
                          : statuses.length === 1
                            ? getStatusLabel(statuses[0])
                            : `${getStatusLabel(statuses[0])} (+${statuses.length - 1})`}
                      </span>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-48 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.status", "Status")}
                    </DropdownMenuLabel>
                    {statuses.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearStatuses();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.allStatuses", "Clear (All Statuses)")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.statuses.map((s: string) => {
                      const isSelected = statuses.includes(s);
                      return (
                        <DropdownMenuItem
                          key={s}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleStatus(s);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{getStatusLabel(s)}</span>
                          {isSelected && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Genres multi-select dropdown */}
            {meta?.genres &&
              meta.genres.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-32 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        genres.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <span className="truncate">
                        {genres.length === 0
                          ? t("aquila.allGenres", "All Genres")
                          : genres.length === 1
                            ? genres[0]
                            : `${genres[0]} (+${genres.length - 1})`}
                      </span>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.genres", "Genres")}
                    </DropdownMenuLabel>
                    {genres.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearGenres();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.allGenres", "Clear (All Genres)")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.genres.map((g: string) => {
                      const isSelected = genres.includes(g);
                      return (
                        <DropdownMenuItem
                          key={g}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleGenre(g);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{g}</span>
                          {isSelected && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Country of Origin multi-select dropdown */}
            {meta?.countries &&
              meta.countries.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-32 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        countries.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="size-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">
                          {countries.length === 0
                            ? t("aquila.allCountries", "All Countries")
                            : countries.length === 1
                              ? getCountryLabel(countries[0])
                              : `${getCountryLabel(countries[0])} (+${countries.length - 1})`}
                        </span>
                      </div>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.countryOfOrigin", "Country of Origin")}
                    </DropdownMenuLabel>
                    {countries.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearCountries();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.allCountries", "Clear (All Countries)")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.countries.map((c: string) => {
                      const isSelected = countries.includes(c);
                      return (
                        <DropdownMenuItem
                          key={c}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleCountry(c);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{getCountryLabel(c)}</span>
                          {isSelected && <Check className="size-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Studio / Publisher / Developer multi-select dropdown */}
            {meta?.studios &&
              meta.studios.length > 0 &&
              !["characters", "actors"].includes(type) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-32 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        studios.length > 0 &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="size-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">
                          {studios.length === 0
                            ? getStudioFilterLabel()
                            : studios.length === 1
                              ? studios[0]
                              : `${studios[0]} (+${studios.length - 1})`}
                        </span>
                      </div>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-56 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-64 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {getStudioFilterLabel()}
                    </DropdownMenuLabel>
                    {studios.length > 0 && (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleClearStudios();
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground py-1.5 cursor-pointer rounded-xl"
                        >
                          <RotateCcw className="size-3 mr-1.5" />
                          {t("aquila.clearStudios", "Clear All")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {meta.studios.map((s: string) => {
                      const isSelected = studios.includes(s);
                      return (
                        <DropdownMenuItem
                          key={s}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleStudio(s);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span className="truncate">{s}</span>
                          {isSelected && <Check className="size-3.5 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

            {/* Adult / NSFW Rating filter */}
            {!["characters", "actors"].includes(type) && (
              <Select value={isAdult} onValueChange={(val) => { setIsAdult(val); setPage(1); }}>
                <SelectTrigger
                  className={cn(
                    "h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-36 text-xs sm:text-sm",
                    isAdult !== "all" && "border-primary/50 text-foreground font-medium bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <ShieldAlert className="size-3.5 text-muted-foreground/70 shrink-0" />
                    <SelectValue placeholder={t("aquila.adultFilter", "Audience")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">{t("aquila.allAudiences", "All Audiences")}</SelectItem>
                  <SelectItem value="adult">{t("aquila.adultOnly", "18+ Adult Only")}</SelectItem>
                  <SelectItem value="non_adult">{t("aquila.nonAdultOnly", "Non-Adult (Safe)")}</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Episode Count Range Filter (Anime / TV) */}
            {(type === "anime" || type === "tv") && (
              <Select value={episodesRange} onValueChange={(val) => { setEpisodesRange(val); setPage(1); }}>
                <SelectTrigger
                  className={cn(
                    "h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-36 text-xs sm:text-sm",
                    episodesRange !== "all" && "border-primary/50 text-foreground font-medium bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Hash className="size-3.5 text-muted-foreground/70 shrink-0" />
                    <SelectValue placeholder={t("aquila.episodesFilter", "Episodes")} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">{t("aquila.allEpisodes", "All Episodes")}</SelectItem>
                  <SelectItem value="1-12">1 - 12 {t("aquila.episodes", "Episodes")}</SelectItem>
                  <SelectItem value="13-24">13 - 24 {t("aquila.episodes", "Episodes")}</SelectItem>
                  <SelectItem value="25-50">25 - 50 {t("aquila.episodes", "Episodes")}</SelectItem>
                  <SelectItem value="51-100">51 - 100 {t("aquila.episodes", "Episodes")}</SelectItem>
                  <SelectItem value="100+">100+ {t("aquila.episodes", "Episodes")}</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Added date filter dropdown */}
            {!["characters", "actors"].includes(type) && (
              <Select
                value={addedWithin}
                onValueChange={handleAddedWithinChange}
              >
                <SelectTrigger className="h-9.5 sm:h-10 bg-background/50 border-border/60 rounded-xl w-full sm:w-36 text-xs sm:text-sm">
                  <SelectValue placeholder={t("aquila.addedTime", "Added Time")} />
                </SelectTrigger>
                <SelectContent className="max-h-60" position="popper">
                  <SelectItem value="all">
                    {t("aquila.addedAnytime", "Added Anytime")}
                  </SelectItem>
                  <SelectItem value="1">{t("aquila.added1DayAgo", "Past 24 Hours")}</SelectItem>
                  <SelectItem value="7">{t("aquila.added7DaysAgo", "Past 7 Days")}</SelectItem>
                  <SelectItem value="30">
                    {t("aquila.added30DaysAgo", "Past 30 Days")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Server-side Multi-Sort dropdown */}
            {!["characters", "actors"].includes(type) && (
              <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between gap-1.5 h-9.5 sm:h-10 px-3 w-full sm:w-auto sm:min-w-36 bg-background/50 hover:bg-background/80 border border-border/60 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-primary/30",
                        sorts.length > 0 &&
                          !(sorts.length === 1 && sorts[0] === "latest") &&
                          "border-primary/50 text-foreground font-medium bg-primary/5",
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <ArrowUpDown className="size-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">
                          {getSortTriggerLabel()}
                        </span>
                      </div>
                      <ChevronDown className="size-3.5 opacity-50 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-2xl p-1.5 shadow-xl z-50 max-h-72 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      {t("aquila.multiSortTitle", "Sort Priority")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {sortOptions.map((opt) => {
                      const priorityIndex = sorts.indexOf(opt.value);
                      const isSelected = priorityIndex !== -1;
                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleSort(opt.value);
                          }}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-xl cursor-pointer transition-colors",
                            isSelected &&
                              "bg-primary/10 font-semibold text-primary",
                          )}
                        >
                          <span>{opt.label}</span>
                          {isSelected && (
                            <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-xs">
                              {priorityIndex + 1}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                    {sorts.length > 0 &&
                      !(sorts.length === 1 && sorts[0] === "latest") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSorts(["latest"]);
                              setPage(1);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground justify-center py-2 cursor-pointer rounded-xl"
                          >
                            <RotateCcw className="size-3 mr-1.5" />
                            {t("aquila.resetSort", "Reset Sort")}
                          </DropdownMenuItem>
                        </>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground h-10 cursor-pointer rounded-lg px-3"
              >
                {t("aquila.clearFilters", "Clear All")}
              </Button>
            )}
          </div>

          {/* Active Filter Chips Row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/20 z-10 animate-in fade-in duration-200">
              <span className="text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Filter className="size-3" />
                {t("aquila.activeFilters", "Active:")}
              </span>

              {/* Year Chips */}
              {years.map((y) => (
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
                    onClick={() => handleToggleYear(y)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove year filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Format Chips */}
              {formats.map((f) => (
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
                    onClick={() => handleToggleFormat(f)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove format filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Status Chips */}
              {statuses.map((s) => (
                <div
                  key={`status-${s}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] opacity-70">
                    {t("aquila.status", "Status")}:
                  </span>
                  <span>{getStatusLabel(s)}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(s)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove status filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Genre Chips */}
              {genres.map((g) => (
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
                    onClick={() => handleToggleGenre(g)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove genre filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Country Chips */}
              {countries.map((c) => (
                <div
                  key={`country-${c}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] opacity-70">
                    {t("aquila.country", "Country")}:
                  </span>
                  <span>{getCountryLabel(c)}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleCountry(c)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove country filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Studio Chips */}
              {studios.map((s) => (
                <div
                  key={`studio-${s}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] opacity-70">
                    {t("aquila.studio", "Studio")}:
                  </span>
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleStudio(s)}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove studio filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {/* Adult Rating Chip */}
              {isAdult !== "all" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] opacity-70">
                    {t("aquila.rating", "Rating")}:
                  </span>
                  <span>
                    {isAdult === "adult"
                      ? t("aquila.adultOnly", "18+ Adult Only")
                      : t("aquila.nonAdultOnly", "Non-Adult (Safe)")}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setIsAdult("all"); setPage(1); }}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove rating filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {/* Episodes Range Chip */}
              {episodesRange !== "all" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] opacity-70">
                    {t("aquila.episodes", "Episodes")}:
                  </span>
                  <span>{episodesRange} eps</span>
                  <button
                    type="button"
                    onClick={() => { setEpisodesRange("all"); setPage(1); }}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove episodes filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {/* Added Within Chip */}
              {addedWithin !== "all" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-secondary/80 text-foreground border border-border/40 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] opacity-70">
                    {t("aquila.addedTime", "Added")}:
                  </span>
                  <span>
                    {addedWithin === "1"
                      ? t("aquila.added1DayAgo", "Past 24 Hours")
                      : addedWithin === "7"
                        ? t("aquila.added7DaysAgo", "Past 7 Days")
                        : t("aquila.added30DaysAgo", "Past 30 Days")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddedWithin("all")}
                    className="hover:bg-foreground/10 rounded p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Remove time filter"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}

              {/* Sort Chips */}
              {sorts.length > 0 &&
                !(sorts.length === 1 && sorts[0] === "latest") &&
                sorts.map((sortKey, idx) => (
                  <div
                    key={`sort-${sortKey}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/25 shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150"
                  >
                    <span className="text-[10px] font-bold opacity-75">
                      #{idx + 1}
                    </span>
                    <span>{getSortLabel(sortKey)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSort(sortKey)}
                      className="hover:bg-primary/25 rounded p-0.5 transition-colors cursor-pointer text-primary/70 hover:text-primary"
                      title="Remove sort criterion"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 cursor-pointer transition-colors"
              >
                {t("aquila.clearSort", "Reset All")}
              </button>
            </div>
          )}
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
