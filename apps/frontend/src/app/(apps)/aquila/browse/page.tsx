"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
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

type SearchResult = {
  id: string;
  title: {
    romaji: string;
    english: string;
  };
  coverImage: {
    large: string;
  };
  format: string;
  status: string;
  isAdult: boolean;
};

// Deduplicated fetching hook
function useSearch() {
  const [data, setData] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (query: string, type: string) => {
    if (!query.trim()) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/aquila/api/search?query=${encodeURIComponent(query)}&type=${type}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch search results");
      }
      const json = await res.json();
      setData(Array.isArray(json) ? json : (json.data ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, performSearch };
}

export default function BrowsePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("anime");

  const { data, isLoading, error, performSearch } = useSearch();

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query, type);
    }, 500);

    return () => clearTimeout(handler);
  }, [query, type, performSearch]);

  useEffect(() => {
    document.title = "Aquila | Browse";
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, type);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse</h1>
          <p className="text-muted-foreground mt-1">
            Search for your favorite anime, manga, and more.
          </p>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-2xl border border-border/40 shadow-sm transition-all duration-300 hover:shadow-md"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles..."
              className="pl-11 h-12 bg-background/40 hover:bg-background/60 focus:bg-background/80 border-border/50 w-full text-base rounded-xl transition-all shadow-sm"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full h-12 bg-background/40 items-center justify-center hover:bg-background/60 data-[state=open]:bg-background/80 border-border/50 text-base rounded-xl transition-all shadow-sm focus:ring-primary/20">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="rounded-xl border-border/50 shadow-xl p-1 bg-popover/95 backdrop-blur-md w-(--radix-select-trigger-width)"
              >
                <SelectItem
                  value="anime"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Anime
                </SelectItem>
                <SelectItem
                  value="manga"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Manga
                </SelectItem>
                <SelectItem
                  value="movies"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Movie
                </SelectItem>
                <SelectItem
                  value="tv"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  TV Show
                </SelectItem>
                <SelectItem
                  value="games"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Games
                </SelectItem>
                <SelectItem
                  value="books"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Books
                </SelectItem>
                <SelectItem
                  value="music"
                  className="rounded-lg cursor-pointer py-2.5 transition-colors focus:bg-primary/10"
                >
                  Music
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
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
          <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-xl">
            Start typing to search for media
          </div>
        )}

        {!isLoading &&
          !error &&
          data !== null &&
          data.length === 0 &&
          query.trim() !== "" && (
            <div className="text-center text-muted-foreground p-12 border-2 border-dashed rounded-xl">
              No results found for "{query}"
            </div>
          )}

        {!isLoading && !error && data && data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
            {data.map((item) => {
              const primaryTitle = item.title.english || item.title.romaji;
              const secondaryTitle = item.title.english
                ? item.title.romaji
                : null;

              return (
                <Link
                  key={item.id}
                  href={`/aquila/${type}/${item.id}`}
                  className="group flex flex-col gap-2 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-muted shadow-sm group-hover:shadow-md border border-border/50">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
