"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MediaEntry } from "./types";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeEditDialog } from "@/components/aquila/AnimeEditDialog";
import { MangaEditDialog } from "@/components/aquila/MangaEditDialog";
import { TvEditDialog } from "@/components/aquila/TvEditDialog";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";
import { GameEditDialog } from "@/components/aquila/GameEditDialog";
import { BookEditDialog } from "@/components/aquila/BookEditDialog";

interface MediaCompactRowProps {
  entry: MediaEntry;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

const MediaCompactRowComponent: React.FC<MediaCompactRowProps> = ({
  entry,
  baseUrl,
  isOwner,
  onRefresh,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Inferred media shape for the dialogs
  const dialogMedia = {
    id: entry.id.toString(),
    title: { romaji: entry.title },
    coverImage: { large: entry.image },
  };

  const inferredType = baseUrl.endsWith("/anime")
    ? "anime"
    : baseUrl.endsWith("/manga")
    ? "manga"
    : baseUrl.endsWith("/tv")
    ? "tv"
    : baseUrl.endsWith("/movies")
    ? "movie"
    : baseUrl.endsWith("/games")
    ? "game"
    : baseUrl.endsWith("/books")
    ? "book"
    : (entry.type?.toLowerCase() || "anime");

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between w-full hover:bg-muted/50 rounded-md pr-2 transition-colors group/row">
        <Link
          href={`${baseUrl}/${entry.id}`}
          prefetch={false}
          className="flex-1 flex cursor-pointer items-center justify-between gap-4 py-2 px-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
              {entry.title}
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-sm text-muted-foreground w-[100px] sm:w-[180px] justify-end shrink-0">
            <span className="w-8 text-right font-medium">{entry.score}</span>
            <span className="w-12 text-right">{entry.progress}</span>
            <span className="w-16 text-right hidden sm:block">{entry.type}</span>
          </div>
        </Link>

        {isOwner && (
          <div className="relative z-20 flex items-center pr-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 transition-all cursor-pointer flex items-center justify-center p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditDialogOpen(true);
              }}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {isOwner && isEditDialogOpen && (
        <>
          {inferredType === "anime" && (
            <AnimeEditDialog
              media={dialogMedia}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
          {inferredType === "manga" && (
            <MangaEditDialog
              media={dialogMedia}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
          {inferredType === "tv" && (
            <TvEditDialog
              media={{ ...dialogMedia, seasons: [] }}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
          {inferredType === "movie" && (
            <MovieEditDialog
              media={dialogMedia}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
          {inferredType === "game" && (
            <GameEditDialog
              media={dialogMedia}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
          {inferredType === "book" && (
            <BookEditDialog
              media={dialogMedia}
              hasListEntry={true}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSaved={handleRefresh}
              onDeleted={handleRefresh}
            />
          )}
        </>
      )}
    </>
  );
};

export const MediaCompactRow = React.memo(
  MediaCompactRowComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.isOwner === nextProps.isOwner &&
      prevProps.baseUrl === nextProps.baseUrl &&
      prevProps.entry.id === nextProps.entry.id &&
      prevProps.entry.title === nextProps.entry.title &&
      prevProps.entry.score === nextProps.entry.score &&
      prevProps.entry.progress === nextProps.entry.progress &&
      prevProps.entry.image === nextProps.entry.image &&
      prevProps.entry.type === nextProps.entry.type &&
      prevProps.entry.format === nextProps.entry.format &&
      prevProps.entry.status === nextProps.entry.status &&
      prevProps.entry.last_updated === nextProps.entry.last_updated &&
      prevProps.entry.last_added === nextProps.entry.last_added
    );
  }
);
