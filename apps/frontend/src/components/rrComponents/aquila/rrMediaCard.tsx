"use client";

import React, { useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Tv,
  BookOpen,
  Gamepad2,
  Film,
  Play,
  Menu,
  Loader2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/types/aquila";
import { RrMediaEditDialog } from "./rrMediaEditDialog";
import RrLapplandImageNotFound from "../rrImages/rrLapplandImageNotFound";

export interface RrMediaCardProps {
  item: MediaItem;
  href: string;
  isOwner?: boolean;
  onIncrement?: () => void;
  isUpdating?: boolean;
  onRefresh?: () => void;
  showProgress?: boolean;
  showScore?: boolean;
  score?: number;
}

const getProgressIcon = (type: string) => {
  switch (type) {
    case "anime":
    case "tv":
      return <Tv className="size-3" />;
    case "manga":
    case "book":
      return <BookOpen className="size-3" />;
    case "game":
      return <Gamepad2 className="size-3" />;
    case "movie":
      return <Film className="size-3" />;
    default:
      return <Play className="size-3" />;
  }
};

const RrMediaCardComponent = ({
  item,
  href,
  isOwner = true,
  onIncrement,
  isUpdating = false,
  onRefresh = () => {},
  showProgress = true,
  showScore = true,
  score,
}: RrMediaCardProps): React.JSX.Element => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const mediaType = item.type;


  const progressPercentage = item.episodes
    ? Math.min((item.progress / item.episodes) * 100, 100)
    : 50;

  return (
    <>
      <div className="group relative flex flex-col w-full bg-card hover:bg-accent/5 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
        {/* Poster Image Container */}
        <div className="relative aspect-2/3 w-full rounded-t-2xl overflow-hidden bg-muted">
          <Link
            href={href}
            prefetch={false}
            className="absolute inset-0 block cursor-pointer z-10"
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 20vw, 15vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                priority={false}
              />
            ) : (
              <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                <RrLapplandImageNotFound className="size-full object-cover scale-150" />
              </div>
            )}
          </Link>

          {/* Hover Overlay Gradient */}
          <div className="absolute inset-0 bg-linear-to-t from-background/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {/* Edit Button (Menu) */}
          {isOwner && (
            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
              <Button
                size="icon"
                variant="secondary"
                className="size-7 sm:size-8 rounded-lg bg-background/85 hover:bg-background border border-border/40 text-muted-foreground hover:text-foreground backdrop-blur-xs transition-all shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditDialogOpen(true);
                }}
              >
                <Menu className="size-4" />
              </Button>
            </div>
          )}

          {/* Quick Increment Button (Floating at bottom-right of poster) */}
          {isOwner && onIncrement && (
            <div className="absolute bottom-2 right-2 z-25 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200">
              <Button
                size="icon"
                className={cn(
                  "size-7 sm:size-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/20 shadow-md transition-all cursor-pointer flex items-center justify-center",
                  isUpdating && "opacity-50 cursor-not-allowed",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onIncrement();
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4.5" />
                )}
              </Button>
            </div>
          )}

          {/* Progress Bar overlay at bottom of poster */}
          {showProgress && item.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/20 z-15 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Metadata Details Area */}
        <div className="p-3 flex flex-col flex-1 gap-2.5">
          <Link href={href} prefetch={false} className="block flex-1 group/title cursor-pointer">
            <h4
              title={item.title}
              className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight group-hover/title:text-primary transition-colors duration-200 tracking-wide wrap-break-word"
            >
              {item.title}
            </h4>
          </Link>

          {/* Stats Row */}
          <div className="flex items-center gap-1.5 mt-auto w-full min-w-0">
            {showProgress &&
              item.progress !== undefined &&
              item.progress > 0 &&
              mediaType !== "movie" && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 text-[10px] font-semibold min-w-0 max-w-full">
                  {getProgressIcon(mediaType)}
                  <span className="truncate whitespace-nowrap">
                    {mediaType === "tv"
                      ? item.meta?.season
                        ? `S${item.meta.season} E${item.meta.episode}`
                        : `Ep ${item.progress}${item.episodes ? `/${item.episodes}` : ""}`
                      : `${
                          mediaType === "game"
                            ? `${item.progress}h`
                            : mediaType === "book"
                              ? `Ch ${item.progress}`
                              : `${mediaType === "manga" ? "Ch" : "Ep"} ${item.progress}`
                        }${item.episodes ? `/${item.episodes}` : ""}`}
                  </span>
                </span>
              )}

            {showScore && score !== undefined && score > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 bg-amber-500/5 text-amber-500 border border-amber-500/10 text-[10px] font-semibold min-w-0">
                <Star className="size-3 fill-current shrink-0" />
                <span className="truncate whitespace-nowrap">{score}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {isOwner && isEditDialogOpen && (
        <RrMediaEditDialog
          media={{
            id: item.id.toString(),
            type: item.type,
            title: { romaji: item.title },
            coverImage: { large: item.image },
          }}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={onRefresh}
          onDeleted={onRefresh}
        />
      )}
    </>
  );
};

export const RrMediaCard = memo(
  RrMediaCardComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.isUpdating === nextProps.isUpdating &&
      prevProps.isOwner === nextProps.isOwner &&
      prevProps.showProgress === nextProps.showProgress &&
      prevProps.showScore === nextProps.showScore &&
      prevProps.score === nextProps.score &&
      prevProps.href === nextProps.href &&
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.progress === nextProps.item.progress &&
      prevProps.item.image === nextProps.item.image &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.item.episodes === nextProps.item.episodes &&
      prevProps.item.type === nextProps.item.type &&
      prevProps.item.meta?.season === nextProps.item.meta?.season &&
      prevProps.item.meta?.episode === nextProps.item.meta?.episode
    );
  },
);
