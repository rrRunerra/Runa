"use client";

import React from "react";
import {
  Bookmark as BookmarkIcon,
  Pencil,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bookmark } from "./types";

interface RrConstellationSavedTabProps {
  isAuthenticated: boolean;
  bookmarks: Bookmark[];
  isDeleting: boolean;
  deleteId: string | null;
  onLoadBookmark: (b: Bookmark) => void;
  onDeleteBookmark: (id: string, name: string) => void;
}

export function RrConstellationSavedTab({
  isAuthenticated,
  bookmarks,
  isDeleting,
  deleteId,
  onLoadBookmark,
  onDeleteBookmark,
}: RrConstellationSavedTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="size-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t("constellationBuilder.savedConstellations")}
          </h3>
        </div>
        {bookmarks.length > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {bookmarks.length}
          </span>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 px-4">
          <BookmarkIcon className="size-8 text-muted-foreground/40 stroke-1" />
          <p className="text-xs text-muted-foreground max-w-xs">
            {t("constellationBuilder.pleaseSignIn")}
          </p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 px-4">
          <Sparkles className="size-8 text-muted-foreground/40 stroke-1" />
          <p className="text-xs text-muted-foreground max-w-xs">
            {t("constellationBuilder.noBookmarksSaved")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-115 overflow-y-auto pr-1">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="bg-background/80 border border-border/80 hover:border-primary/40 hover:bg-muted/30 p-3 rounded-xl flex items-center justify-between gap-3 transition-all group shadow-2xs"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {b.name}
                </h4>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {b.description ||
                    t("constellationBuilder.savedConstellation")}
                </p>
                <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60">
                    {Array.isArray(b.stars) ? b.stars.length : 0}{" "}
                    {t("constellationBuilder.stars")}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60">
                    {Array.isArray(b.connections) ? b.connections.length : 0}{" "}
                    {t("constellationBuilder.connections")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  onClick={() => onLoadBookmark(b)}
                  size="xs"
                  variant="outline"
                  className="h-7 px-2.5 rounded-lg text-[11px] font-medium border-border/80 text-primary hover:bg-primary/10 hover:border-primary/40 cursor-pointer flex items-center gap-1 transition-all active:scale-95"
                  title={`Edit constellation ${b.name}`}
                  aria-label={`Edit constellation ${b.name}`}
                >
                  <Pencil className="size-3" />
                  {t("constellationBuilder.edit")}
                </Button>
                <Button
                  onClick={() => onDeleteBookmark(b.id, b.name)}
                  size="xs"
                  variant="outline"
                  disabled={isDeleting && deleteId === b.id}
                  className="h-7 px-2 rounded-lg text-[11px] border-destructive/25 text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                  title={`Delete constellation ${b.name}`}
                  aria-label={`Delete constellation ${b.name}`}
                >
                  {isDeleting && deleteId === b.id ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
