"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { motion, Variants } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  getSearchHistory,
  addSearchQuery,
  deleteSearchQuery,
  clearSearchHistory,
  getRecentlyOpened,
  addRecentlyOpened,
  deleteRecentlyOpened,
  clearRecentlyOpened,
  type OpenedItemEntry,
} from "@/lib/search-history";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { SearchResult } from "@/types/aquila";
import { RrBrowseCard } from "@/components/rrComponents/aquila/rrBrowseCard";
import { RrBrowseSearchForm } from "@/components/rrComponents/aquila/rrBrowseSearchForm";
import { RrBrowseHistory } from "@/components/rrComponents/aquila/rrBrowseHistory";
import RrLapplandBrowse from "@/components/rrComponents/rrImages/rrLapplandBrowse";
import RrLapplandBrowseNotFound from "@/components/rrComponents/rrImages/rrLapplandBrowseNotFound";

export default function BrowsePage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState("anime");
  const [history, setHistory] = useState<string[]>([]);
  const [openedItems, setOpenedItems] = useState<OpenedItemEntry[]>([]);
  const isLoadedRef = useRef(false);

  const trimmedQuery = debouncedQuery.trim();
  const mediaType =
    type === "movies"
      ? "movie"
      : type === "games"
        ? "game"
        : type === "books"
          ? "book"
          : type === "characters"
            ? "character"
            : type === "actors"
              ? "actor"
              : type;

  const {
    data: rawData,
    error,
    isLoading,
  } = useSWR<any>(
    trimmedQuery
      ? `${process.env.NEXT_PUBLIC_API_URL}/${mediaType}/search/${encodeURIComponent(trimmedQuery)}`
      : null,
    fetcher,
  );

  const searchResults = rawData ? (rawData.data ?? rawData) : null;
  const data: SearchResult[] = Array.isArray(searchResults)
    ? searchResults
    : [];

  const isNotFound =
    !isLoading && !error && data.length === 0 && trimmedQuery !== "";
  const Wallpaper = isNotFound ? RrLapplandBrowseNotFound : RrLapplandBrowse;

  // Load initial query and type from URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get("q");
    const urlType = params.get("type");

    if (urlType) {
      setType(urlType);
    } else {
      const savedType = localStorage.getItem("aquila_browse_category");
      if (savedType) {
        setType(savedType);
      }
    }
    if (urlQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
    setTimeout(() => {
      isLoadedRef.current = true;
    }, 0);
  }, []);

  // Save selected category to localStorage when it changes
  useEffect(() => {
    if (!isLoadedRef.current) return;
    localStorage.setItem("aquila_browse_category", type);
  }, [type]);

  // Update URL search parameters when query or type changes
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const url = new URL(window.location.href);
    if (query.trim()) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    url.searchParams.set("type", type);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [query, type]);

  // Load history and recently opened items when category (type) changes
  useEffect(() => {
    let active = true;
    getSearchHistory(type)
      .then((queries: string[]) => {
        if (active) setHistory(queries);
      })
      .catch((err: unknown) => {
        console.error("Failed to load search history", err);
      });

    getRecentlyOpened(type)
      .then((items: OpenedItemEntry[]) => {
        if (active) setOpenedItems(items);
      })
      .catch((err: unknown) => {
        console.error("Failed to load recently opened items", err);
      });

    return () => {
      active = false;
    };
  }, [type]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  const saveQuery = useCallback(
    async (q: string): Promise<void> => {
      const trimmed = q.trim();
      if (!trimmed) return;
      try {
        await addSearchQuery(type, trimmed);
        const updated = await getSearchHistory(type);
        setHistory(updated);
      } catch (err: unknown) {
        console.error("Failed to save query", err);
      }
    },
    [type],
  );

  // Save query when debounced query resolves
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed) {
      saveQuery(trimmed);
    }
  }, [debouncedQuery, saveQuery]);

  useEffect(() => {
    document.title = "Aquila > Browse";
  }, []);

  const handleQueryChange = (val: string): void => {
    const match = val.match(
      /^@(anime|manga|movies|movie|tv show|tv|games|game|books|book|characters|character|actors|actor)\s+(.*)$/i,
    );

    if (match) {
      const rawType = match[1].toLowerCase();
      const remaining = match[2];

      let targetType = rawType;
      if (rawType === "movie") targetType = "movies";
      if (rawType === "tv show") targetType = "tv";
      if (rawType === "game") targetType = "games";
      if (rawType === "book") targetType = "books";
      if (rawType === "character") targetType = "characters";
      if (rawType === "actor") targetType = "actors";

      setType(targetType);
      setQuery(remaining);
      setDebouncedQuery(remaining);
    } else {
      setQuery(val);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setDebouncedQuery(query);
    saveQuery(query);
  };

  const handleTypeChange = (newType: string): void => {
    setType(newType);
    setDebouncedQuery(query);
  };

  const handleDeleteHistoryItem = useCallback(
    async (hQuery: string): Promise<void> => {
      try {
        await deleteSearchQuery(type, hQuery);
        const updated = await getSearchHistory(type);
        setHistory(updated);
      } catch (err: unknown) {
        console.error("Failed to delete history item", err);
      }
    },
    [type],
  );

  const handleClearHistory = useCallback(async (): Promise<void> => {
    try {
      await clearSearchHistory(type);
      setHistory([]);
    } catch (err: unknown) {
      console.error("Failed to clear search history", err);
    }
  }, [type]);

  const handleOpenItem = useCallback(
    async (item: SearchResult): Promise<void> => {
      try {
        await addRecentlyOpened(type, {
          id: item.id,
          title: item.title,
          coverImage: item.coverImage,
          isAdult: item.isAdult,
        });
        const updated = await getRecentlyOpened(type);
        setOpenedItems(updated);
      } catch (err: unknown) {
        console.error("Failed to add recently opened item", err);
      }
    },
    [type],
  );

  const handleDeleteOpenedItem = useCallback(
    async (id: string | number): Promise<void> => {
      try {
        await deleteRecentlyOpened(type, id);
        const updated = await getRecentlyOpened(type);
        setOpenedItems(updated);
      } catch (err: unknown) {
        console.error("Failed to delete recently opened item", err);
      }
    },
    [type],
  );

  const handleClearOpenedItems = useCallback(async (): Promise<void> => {
    try {
      await clearRecentlyOpened(type);
      setOpenedItems([]);
    } catch (err: unknown) {
      console.error("Failed to clear recently opened items", err);
    }
  }, [type]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const categories = [
    { id: "anime", label: "Anime" },
    { id: "manga", label: "Manga" },
    { id: "movies", label: "Movie" },
    { id: "tv", label: "TV Show" },
    { id: "games", label: "Games" },
    { id: "books", label: "Books" },
    { id: "characters", label: "Characters" },
    { id: "actors", label: "Actors" },
  ];

  return (
    <div className="relative container mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-8 max-w-7xl min-h-full">
      <div className="relative z-10 flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
              Browse
            </h1>
            <p className="text-muted-foreground mt-1">
              Search for your favorite anime, manga, and more.
            </p>
          </div>

          {/* Animated Glassmorphic Category Selector Pills */}
          <div className="flex p-1 bg-muted/40 backdrop-blur-xs border border-border/30 rounded-2xl w-full md:w-auto flex-wrap gap-1 shadow-2xs">
            {categories.map((cat) => {
              const isActive = type === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleTypeChange(cat.id)}
                  className={cn(
                    "relative px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 select-none cursor-pointer flex-1 md:flex-none text-center outline-hidden",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryHighlight"
                      className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/20"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 25,
                      }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Animated Search Box */}
        <RrBrowseSearchForm
          query={query}
          onChange={handleQueryChange}
          onSubmit={handleSearchSubmit}
          placeholder={
            ["characters", "actors"].includes(type)
              ? `Search names... (try @anime, @manga to switch type)`
              : `Search titles... (try @anime, @manga to switch type)`
          }
        />

        {/* Animated Search History badges */}
        <RrBrowseHistory
          history={history}
          onSelect={(hQuery) => {
            setQuery(hQuery);
            setDebouncedQuery(hQuery);
          }}
          onDelete={handleDeleteHistoryItem}
          onClear={handleClearHistory}
        />
      </div>

      <div className="relative z-10 min-h-[400px]">
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Spinner className="size-8 text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center text-destructive p-8 bg-destructive/10 rounded-lg border border-destructive/20">
            {error.message || error}
          </div>
        )}

        {!isLoading && !error && data.length === 0 && trimmedQuery === "" && (
          <div className="relative min-h-[400px]">
            {/* The watermark background sits behind */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute left-1/2 -translate-x-1/2 top-0 select-none z-0 pointer-events-none"
            >
              <RrLapplandBrowse className="w-[550px] h-[550px] md:w-[850px] md:h-[850px] text-foreground opacity-[0.05] dark:opacity-[0.03]" />
            </motion.div>

            {/* The recently viewed items sit on top */}
            {openedItems.length > 0 && (
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold tracking-tight">
                    Recently Viewed
                  </h2>
                  <button
                    type="button"
                    onClick={handleClearOpenedItems}
                    className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors font-semibold py-1 px-2.5 hover:bg-destructive/10 rounded-md cursor-pointer"
                  >
                    Clear history
                  </button>
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-2"
                >
                  {openedItems.map((item) => (
                    <RrBrowseCard
                      key={item.id}
                      item={item}
                      type={type}
                      onDelete={() => handleDeleteOpenedItem(item.id)}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        )}

        {!isLoading && !error && data.length === 0 && trimmedQuery !== "" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-6 select-none gap-6"
          >
            <div className="text-center text-muted-foreground/60 text-sm font-medium">
              No results found for &ldquo;{query}&rdquo;
            </div>
            <RrLapplandBrowseNotFound className="w-[550px] h-[550px] md:w-[850px] md:h-[850px] text-foreground opacity-[0.05] dark:opacity-[0.03] pointer-events-none" />
          </motion.div>
        )}

        {!isLoading && !error && data.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4"
          >
            {data.map((item) => (
              <RrBrowseCard
                key={item.id}
                item={item}
                type={type}
                onClick={() => {
                  saveQuery(query);
                  handleOpenItem(item);
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
