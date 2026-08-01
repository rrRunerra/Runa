"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Search, Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { BASE_CONNECTION_PROVIDERS } from "@/lib/providers";

interface ConnectionProvider {
  key: string;
  name: string;
  capabilities: any[];
  search?: (query: string, capability: any) => Promise<any[]>;
}

interface RrMediaConnectionSearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  mediaTitle: string;
  activeSearchProvider: string | null;
  connectionProviders: ConnectionProvider[];
  onSelectResult: (provider: string, resultId: string) => void;
}

// In-memory cache for connection search results
const connectionSearchCache: Record<string, any[]> = {};

export function RrMediaConnectionSearchModal({
  isOpen,
  onOpenChange,
  mediaType,
  mediaTitle,
  activeSearchProvider,
  connectionProviders,
  onSelectResult,
}: RrMediaConnectionSearchModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(mediaTitle);
      setSearchError(null);
      setSearchResults([]);
      if (activeSearchProvider) {
        performSearch(mediaTitle, activeSearchProvider);
      }
    }
  }, [isOpen, mediaTitle, activeSearchProvider]);

  const performSearch = async (
    query: string,
    providerKey: string,
  ): Promise<void> => {
    if (!query || !providerKey) return;

    setSearchError(null);
    setIsSearching(true);
    setSearchResults([]);

    const cacheKey = `${providerKey}-${mediaType}-${query.trim().toLowerCase()}`;
    if (connectionSearchCache[cacheKey]) {
      setSearchResults(connectionSearchCache[cacheKey]);
      setIsSearching(false);
      return;
    }

    try {
      const provider = BASE_CONNECTION_PROVIDERS.find(
        (p) => p.key === providerKey,
      );
      if (provider && provider.search) {
        const searchCap =
          mediaType === "tv"
            ? "TV_SHOWS"
            : mediaType === "movie"
              ? "MOVIES"
              : (mediaType.toUpperCase() as any);
        const results = await provider.search(query, searchCap);
        connectionSearchCache[cacheKey] = results;
        setSearchResults(results);
      }
    } catch (err: any) {
      console.error(`Failed to search ${providerKey}`, err);
      setSearchError(
        err.message ||
          t("aquila.searchErrorGeneric", { provider: providerKey }),
      );
      toast.error(t("aquila.searchFailed", { error: err.message || err }));
    } finally {
      setIsSearching(false);
    }
  };

  const currentProvider = connectionProviders.find(
    (p) => p.key === activeSearchProvider,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-162.5 md:max-w-187.5 bg-background/90 backdrop-blur-2xl border border-border/60 rounded-2xl shadow-2xl text-foreground [&>button]:text-foreground [&>button]:z-60 p-6 flex flex-col gap-4">
        <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Search className="size-4 text-primary" />
            {t("aquila.searchOnProvider", {
              provider: currentProvider?.name || activeSearchProvider,
            })}
          </span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("aquila.searchModalDescription")}
        </DialogDescription>

        {searchError && (
          <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-semibold">{searchError}</span>
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder={t("aquila.searchProviderPlaceholder", {
                provider: currentProvider?.name || "media",
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && activeSearchProvider) {
                  performSearch(searchQuery, activeSearchProvider);
                }
              }}
              className="bg-background/80 border border-border/70 rounded-xl text-xs placeholder:text-muted-foreground/40 h-10 pl-9 pr-3 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/60"
            />
          </div>
          <Button
            onClick={() =>
              activeSearchProvider &&
              performSearch(searchQuery, activeSearchProvider)
            }
            disabled={isSearching}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-bold px-5 cursor-pointer text-xs transition-all shadow-md shadow-primary/20 shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                {t("aquila.searching")}
              </>
            ) : (
              t("aquila.search")
            )}
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto mt-2 pr-1 custom-scrollbar flex flex-col gap-2">
          {searchResults.map((result, idx) => (
            <button
              key={`${activeSearchProvider}-${result.id}-${idx}`}
              className="flex items-center gap-3.5 w-full p-2.5 rounded-xl bg-card/40 hover:bg-muted/60 text-left cursor-pointer transition-all border border-border/50 hover:border-primary/40 group shadow-2xs"
              onClick={() => {
                if (activeSearchProvider) {
                  onSelectResult(activeSearchProvider, result.id);
                }
              }}
            >
              {result.image && (
                <img
                  src={result.image}
                  alt={result.title}
                  className="w-11 h-15 object-cover rounded-lg bg-background/50 border border-border/40 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {result.title}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1 font-medium flex items-center gap-2">
                  <span className="bg-muted px-2 py-0.5 rounded-md uppercase font-bold text-[9px]">
                    {result.format || t("aquila.unknown")}
                  </span>
                  {result.episodes
                    ? ` · ${t("aquila.episodesCount", { count: result.episodes })}`
                    : ""}
                </p>
              </div>
              <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <Plus className="size-4" />
                </span>
              </div>
            </button>
          ))}
          {!isSearching && searchResults.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground bg-card/30 border border-dashed border-border/60 rounded-xl">
              {t("aquila.typeQueryToSearch")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
