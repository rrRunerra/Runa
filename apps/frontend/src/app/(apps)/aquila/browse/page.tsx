"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { SearchResult } from "@/types/aquila";

// Deduplicated fetching hook
function useSearch() {
  const [data, setData] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(
    async (query: string, type: string, force: boolean = false): Promise<void> => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setData(null);
        return;
      }

      // Check sessionStorage cache first (unless force refresh is true)
      if (!force && typeof window !== "undefined") {
        try {
          const cacheKey = `search_cache:${type}:${trimmedQuery.toLowerCase()}`;
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsedResults: SearchResult[] = JSON.parse(cached);
            setData(parsedResults);
            return;
          }
        } catch (e: unknown) {
          console.error("Failed to read from search cache", e);
        }
      }

      setIsLoading(true);
      setError(null);
      try {
        // Standardize type for URL and parameter
        const mediaType =
          type === "movies" ? "movie" :
          type === "games" ? "game" :
          type === "books" ? "book" : type;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/${mediaType}/search?name=${encodeURIComponent(query)}`,
        );
        if (!res.ok) {
          throw new Error("Failed to fetch search results");
        }
        const json = await res.json();
        // Handle different search result structures if any
        const results = json.data ?? json;
        const parsedResults: SearchResult[] = Array.isArray(results) ? results : [];
        setData(parsedResults);

        // Save to cache
        if (typeof window !== "undefined") {
          try {
            const cacheKey = `search_cache:${type}:${trimmedQuery.toLowerCase()}`;
            sessionStorage.setItem(cacheKey, JSON.stringify(parsedResults));
          } catch (e: unknown) {
            console.error("Failed to save to search cache", e);
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { data, isLoading, error, performSearch };
}

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("anime");
  const [history, setHistory] = useState<string[]>([]);
  const [openedItems, setOpenedItems] = useState<OpenedItemEntry[]>([]);
  const isLoadedRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  const { data, isLoading, error, performSearch } = useSearch();

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

  const saveQuery = useCallback(async (q: string): Promise<void> => {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      await addSearchQuery(type, trimmed);
      const updated = await getSearchHistory(type);
      setHistory(updated);
    } catch (err: unknown) {
      console.error("Failed to save query", err);
    }
  }, [type]);

  const handleDeleteHistoryItem = useCallback(async (hQuery: string): Promise<void> => {
    try {
      await deleteSearchQuery(type, hQuery);
      const updated = await getSearchHistory(type);
      setHistory(updated);
    } catch (err: unknown) {
      console.error("Failed to delete history item", err);
    }
  }, [type]);

  const handleClearHistory = useCallback(async (): Promise<void> => {
    try {
      await clearSearchHistory(type);
      setHistory([]);
    } catch (err: unknown) {
      console.error("Failed to clear search history", err);
    }
  }, [type]);

  const handleOpenItem = useCallback(async (item: SearchResult): Promise<void> => {
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
  }, [type]);

  const handleDeleteOpenedItem = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteRecentlyOpened(type, id);
      const updated = await getRecentlyOpened(type);
      setOpenedItems(updated);
    } catch (err: unknown) {
      console.error("Failed to delete recently opened item", err);
    }
  }, [type]);

  const handleClearOpenedItems = useCallback(async (): Promise<void> => {
    try {
      await clearRecentlyOpened(type);
      setOpenedItems([]);
    } catch (err: unknown) {
      console.error("Failed to clear recently opened items", err);
    }
  }, [type]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(async () => {
      await performSearch(query, type);
      if (query.trim()) {
        await saveQuery(query);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query, type, performSearch, saveQuery]);

  useEffect(() => {
    document.title = "Aquila > Browse";
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    const match = val.match(/^@(anime|manga|movies|movie|tv show|tv|games|game|books|book)\s+(.*)$/i);
    
    if (match) {
      const rawType = match[1].toLowerCase();
      const remaining = match[2];
      
      let targetType = rawType;
      if (rawType === "movie") targetType = "movies";
      if (rawType === "tv show") targetType = "tv";
      if (rawType === "game") targetType = "games";
      if (rawType === "book") targetType = "books";
      
      setType(targetType);
      setQuery(remaining);
    } else {
      setQuery(val);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    performSearch(query, type, true);
    saveQuery(query);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 110,
        damping: 15,
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
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl">
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">Browse</h1>
            <p className="text-muted-foreground mt-1">
              Search for your favorite anime, manga, and more.
            </p>
          </div>

          {/* Animated Glassmorphic Category Selector Pills */}
          <div className="flex p-1 bg-muted/40 backdrop-blur-xs border border-border/30 rounded-2xl w-full md:w-auto self-stretch md:self-center shadow-2xs">
            {categories.map((cat) => {
              const isActive = type === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setType(cat.id)}
                  className={cn(
                    "relative px-5 py-2 rounded-xl text-sm font-semibold transition-colors duration-200 select-none cursor-pointer flex-1 md:flex-none text-center outline-hidden",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryHighlight"
                      className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/20"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Animated Search Box */}
        <motion.form
          onSubmit={handleSearchSubmit}
          animate={{
            scale: isFocused ? 1.005 : 1,
            borderColor: isFocused ? "var(--color-primary)" : "var(--color-border)",
            boxShadow: isFocused
              ? "0 10px 25px -5px rgba(59, 130, 246, 0.08), 0 8px 10px -6px rgba(59, 130, 246, 0.08)"
              : "0 1px 2px 0 rgba(0, 0, 0, 0.02)",
          }}
          transition={{ duration: 0.2 }}
          style={{
            borderColor: isFocused ? "oklch(var(--primary))" : undefined
          }}
          className={cn(
            "flex gap-4 items-center bg-card/60 backdrop-blur-xs p-3 rounded-2xl border transition-all duration-300 w-full",
            isFocused ? "bg-background shadow-md" : "border-border/40 hover:border-border/60 hover:bg-card"
          )}
        >
          <div className="relative flex-1 w-full flex items-center">
            <motion.div
              animate={{ rotate: isFocused ? 90 : 0, scale: isFocused ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <Search className="h-5 w-5 text-muted-foreground/60" />
            </motion.div>
            <Input
              value={query}
              onChange={handleQueryChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search titles... (try @anime, @manga to switch type)"
              className="pl-11 pr-10 h-12 bg-transparent border-none w-full text-base rounded-xl transition-all shadow-none! focus-visible:ring-0! outline-hidden"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.form>

        {/* Animated Search History badges */}
        {history.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground/80 mt-0.5 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mr-1 select-none">
              Recent:
            </span>
            <div className="flex flex-wrap gap-1.5 items-center flex-1">
              <AnimatePresence mode="popLayout">
                {history.map((hQuery) => (
                  <motion.div
                    key={hQuery}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.2 }}
                    layout
                  >
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 flex items-center gap-1.5 py-0.5 h-6 rounded-md px-2 text-xs font-normal transition-colors border border-border/40 group/badge"
                      onClick={(): void => {
                        setQuery(hQuery);
                        performSearch(hQuery, type);
                      }}
                    >
                      <span>{hQuery}</span>
                      <button
                        type="button"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                          e.stopPropagation();
                          handleDeleteHistoryItem(hQuery);
                        }}
                        className="text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-0.5 transition-colors flex items-center justify-center ml-0.5 cursor-pointer"
                        title="Remove search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors ml-auto font-semibold py-1 px-2.5 hover:bg-destructive/10 rounded-md cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[400px]">
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center text-destructive p-8 bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

        {!isLoading && !error && data === null && query.trim() === "" && (
          <div className="space-y-6">
            {openedItems.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold tracking-tight">Recently Viewed</h2>
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
                  {openedItems.map((item) => {
                    const primaryTitle = item.title.english || item.title.romaji;
                    const secondaryTitle = item.title.english
                      ? item.title.romaji
                      : null;

                    return (
                      <motion.div
                        variants={itemVariants}
                        key={item.id}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className="group relative flex flex-col gap-2 rounded-xl"
                      >
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteOpenedItem(item.id);
                          }}
                          className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-md text-white hover:text-destructive hover:bg-black/85 rounded-full p-1.5 transition-all opacity-0 group-hover:opacity-100 shadow-md flex items-center justify-center pointer-events-auto cursor-pointer"
                          title="Remove from history"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        <Link
                          href={`/aquila/${type}/${item.id}`}
                          className="flex flex-col gap-2 h-full"
                        >
                          <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted shadow-sm group-hover:shadow-md border border-border/50 transition-all">
                            {item.coverImage?.large ? (
                              <Image
                                src={item.coverImage.large}
                                alt={primaryTitle}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary">
                                <span className="text-xs text-muted-foreground">
                                  No Image
                                </span>
                              </div>
                            )}

                            {item.isAdult && (
                              <div className="absolute top-2 left-2 z-10">
                                <Badge
                                  variant="outline"
                                  className="bg-destructive/90 text-destructive-foreground border-destructive-foreground/20 backdrop-blur-sm font-bold shadow-sm"
                                >
                                  18+
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col px-1">
                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                              {primaryTitle}
                            </h3>
                            {secondaryTitle && (
                              <p
                                className="text-xs text-muted-foreground line-clamp-1 mt-0.5"
                                title={secondaryTitle}
                              >
                                {secondaryTitle}
                              </p>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center text-muted-foreground/60 p-12 border-2 border-dashed border-border/55 rounded-2xl flex flex-col items-center justify-center gap-2 select-none"
              >
                <Search className="h-8 w-8 opacity-40 mb-1" />
                <span className="font-semibold text-sm">Start searching for media</span>
                <span className="text-xs">Type a title or use shortcuts like @anime to explore</span>
              </motion.div>
            )}
          </div>
        )}

        {!isLoading &&
          !error &&
          data !== null &&
          data.length === 0 &&
          query.trim() !== "" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center text-muted-foreground/60 p-12 border-2 border-dashed border-border/55 rounded-2xl select-none"
            >
              No results found for &ldquo;{query}&rdquo;
            </motion.div>
          )}

        {!isLoading && !error && data && data.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4"
          >
            {data.map((item) => {
              const primaryTitle = item.title.english || item.title.romaji;
              const secondaryTitle = item.title.english
                ? item.title.romaji
                : null;

              return (
                <motion.div
                  variants={itemVariants}
                  key={item.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2 rounded-xl"
                >
                  <Link
                    href={`/aquila/${type}/${item.id}`}
                    onClick={(): void => {
                      saveQuery(query);
                      handleOpenItem(item);
                    }}
                    className="group flex flex-col gap-2 rounded-xl h-full"
                  >
                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted shadow-sm group-hover:shadow-md border border-border/50 transition-all">
                      {item.coverImage?.large ? (
                        <Image
                          src={item.coverImage.large}
                          alt={primaryTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <span className="text-xs text-muted-foreground">
                            No Image
                          </span>
                        </div>
                      )}

                      {item.isAdult && (
                        <div className="absolute top-2 right-2 z-10">
                          <Badge
                            variant="outline"
                            className="bg-destructive/90 text-destructive-foreground border-destructive-foreground/20 backdrop-blur-sm font-bold shadow-sm"
                          >
                            18+
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col px-1">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {primaryTitle}
                      </h3>
                      {secondaryTitle && (
                        <p
                          className="text-xs text-muted-foreground line-clamp-1 mt-0.5"
                          title={secondaryTitle}
                        >
                          {secondaryTitle}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
