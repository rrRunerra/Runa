"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Plus, Star, Layers, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { RrMediaEditDialog } from "./rrMediaEditDialog";

export interface RrUserListSequelsTabProps {
  username: string;
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
}

interface SimilarItem {
  id: number | string;
  mediaType: string;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  coverImage?: string;
  format?: string;
  status?: string;
  score?: number;
  episodes?: number;
  chapters?: number;
  volumes?: number;
  year?: number;
  relationType: string;
  isAddedToList: boolean;
  userListStatus?: string | null;
  userListScore?: number | null;
  baseMedia: {
    id: number | string;
    title: string;
    coverImage?: string;
  };
}

export function RrUserListSequelsTab({
  username,
  mediaType,
}: RrUserListSequelsTabProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [search, setSearch] = useState("");
  const [includeInList, setIncludeInList] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string | number>>(new Set());
  const [editItem, setEditItem] = useState<SimilarItem | null>(null);

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/list/${mediaType}/user/${username}/sequels?includeInList=${includeInList}&search=${encodeURIComponent(search)}`;

  const {
    data,
    isLoading,
    mutate: mutateSequels,
  } = useSWR<{
    items: SimilarItem[];
    totalCount: number;
  }>(apiUrl, fetcher, {
    revalidateOnFocus: false,
  });

  const isOwnList =
    session?.user?.username?.toLowerCase() === username.toLowerCase();

  const handleQuickAddPlanning = async (item: SimilarItem) => {
    if (!session) {
      toast.error(t("aquila.loginRequired"));
      return;
    }

    setAddingIds((prev) => new Set(prev).add(item.id));
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/list/${mediaType}/entry/save`;
      const payload: any = {
        status: "Planning",
      };

      if (mediaType === "anime") payload.animeId = Number(item.id);
      else if (mediaType === "manga") payload.mangaId = Number(item.id);
      else if (mediaType === "tv") payload.tvId = String(item.id);
      else if (mediaType === "movie") payload.movieId = String(item.id);
      else if (mediaType === "game") payload.gameId = String(item.id);
      else if (mediaType === "book") payload.bookId = String(item.id);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(t("aquila.addedToPlanning"));
        mutateSequels();
      } else {
        toast.error(t("aquila.failedAddToList"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("aquila.failedAddToList"));
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const getMediaDetailHref = (item: SimilarItem) => {
    const typeRoute =
      mediaType === "movie"
        ? "movies"
        : mediaType === "game"
          ? "games"
          : mediaType === "book"
            ? "books"
            : mediaType;
    return `/aquila/${typeRoute}/${item.id}`;
  };

  return (
    <div className="w-full space-y-6 pt-2">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("aquila.searchSimilarPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl bg-background/60 border-border focus:border-primary"
          />
        </div>

        {/* Include List Toggle */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-card border border-border shrink-0">
          <Switch
            id="include-list-toggle"
            checked={includeInList}
            onCheckedChange={setIncludeInList}
          />
          <Label
            htmlFor="include-list-toggle"
            className="text-xs font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground"
          >
            {t("aquila.includeItemsInList")}
          </Label>
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-2/3 rounded-2xl bg-muted/40 animate-pulse border border-border/30"
            />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {t("aquila.noSimilarFound")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t("aquila.noSimilarFoundDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {data.items.map((item) => (
              <motion.div
                key={`${item.id}-${item.relationType}`}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="group relative flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300"
              >
                {/* Cover Image Container */}
                <div className="relative aspect-2/3 w-full overflow-hidden bg-muted/30">
                  {item.coverImage ? (
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Sparkles className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent" />

                  {/* Base Title Attribution */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 z-10">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold truncate bg-background/80 backdrop-blur-md px-2 py-1 rounded-md border border-border">
                      <Layers className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        To: {item.baseMedia.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-col flex-1 p-3 space-y-2">
                  <Link
                    href={getMediaDetailHref(item)}
                    className="font-bold text-xs text-foreground line-clamp-2 hover:text-primary transition-colors"
                  >
                    {item.title}
                  </Link>

                  {/* Sub Details */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider">
                      {item.format || item.year || mediaType}
                    </span>
                    {item.score ? (
                      <div className="flex items-center gap-0.5 text-foreground font-bold">
                        <Star className="w-3 h-3 fill-primary text-primary" />
                        <span>{item.score}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Already in List indicator */}
                  {item.isAddedToList && (
                    <div className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 text-center">
                      In List ({item.userListStatus})
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-1 mt-auto flex items-center gap-1.5">
                    {!item.isAddedToList && isOwnList && (
                      <Button
                        size="sm"
                        variant="default"
                        disabled={addingIds.has(item.id)}
                        onClick={() => handleQuickAddPlanning(item)}
                        className="flex-1 h-7 text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg gap-1 shadow-sm"
                      >
                        {addingIds.has(item.id) ? (
                          <Clock className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        <span>{t("aquila.quickAdd")}</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditItem(item)}
                      className="h-7 text-[10px] font-semibold rounded-lg px-2.5 border-border hover:bg-accent"
                    >
                      {item.isAddedToList ? "Edit" : "Add"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog Modal */}
      {editItem && (
        <RrMediaEditDialog
          media={{
            id: String(editItem.id),
            type: (editItem.mediaType || mediaType) as any,
            title: {
              romaji: editItem.titleRomaji || editItem.title,
              english: editItem.titleEnglish || editItem.title,
            },
            coverImage: { large: editItem.coverImage || "" },
            episodes: editItem.episodes,
            chapters: editItem.chapters,
          }}
          hasListEntry={editItem.isAddedToList}
          open={!!editItem}
          onOpenChange={(open) => {
            if (!open) setEditItem(null);
          }}
          onSaved={() => {
            mutateSequels();
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}
