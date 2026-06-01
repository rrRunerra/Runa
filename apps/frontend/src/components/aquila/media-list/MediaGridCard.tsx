"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MediaEntry } from "./types";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimeEditDialog } from "@/components/aquila/AnimeEditDialog";
import { MangaEditDialog } from "@/components/aquila/MangaEditDialog";
import { TvEditDialog } from "@/components/aquila/TvEditDialog";
import { MovieEditDialog } from "@/components/aquila/MovieEditDialog";

interface MediaGridCardProps {
  entry: MediaEntry;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

export const MediaGridCard: React.FC<MediaGridCardProps> = ({
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
    : (entry.type?.toLowerCase() || "anime");

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="relative group w-full aspect-2/3 overflow-hidden rounded-md bg-card transition-all lg:hover:scale-[1.02] lg:hover:shadow-lg">
        <Link
          href={`${baseUrl}/${entry.id}`}
          prefetch={false}
          className="absolute inset-0 block cursor-pointer z-10"
        >
          <div className="absolute inset-0">
            <Image
              src={entry.image}
              alt={entry.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="eager"
              className="object-cover transition-transform duration-300 lg:group-hover:scale-105"
            />
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent z-15" />

          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 pt-4 sm:pt-6 flex flex-col gap-1 sm:gap-1.5 z-20">
            <h4 className="font-medium text-xs sm:text-sm text-foreground line-clamp-2 leading-tight">
              {entry.title}
            </h4>
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold">
              <span className="text-purple-400">{entry.progress}</span>
              <span className="text-pink-400">{entry.score}</span>
            </div>
          </div>
        </Link>

        {isOwner && (
          <div className="absolute top-2 right-2 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 hover:border-primary/30 text-white hover:text-primary transition-all cursor-pointer pointer-events-auto flex items-center justify-center p-0"
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

      {isOwner && (
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
        </>
      )}
    </>
  );
};
