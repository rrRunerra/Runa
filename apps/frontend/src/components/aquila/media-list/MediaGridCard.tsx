"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Star, Tv, BookOpen, Gamepad2, Film, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
// Keep your existing dialog imports here...
import { MediaEntry } from "./types";

interface MediaGridCardProps {
  entry: MediaEntry;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

const getProgressIcon = (type: string) => {
  switch (type) {
    case "anime":
    case "tv": return <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "manga":
    case "book": return <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "game": return <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    case "movie": return <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
    default: return <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />;
  }
};

export const MediaGridCard: React.FC<MediaGridCardProps> = ({ entry, baseUrl, isOwner, onRefresh }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const dialogMedia = {
    id: entry.id.toString(),
    title: { romaji: entry.title },
    coverImage: { large: entry.image },
  };

  const inferredType = baseUrl.endsWith("/anime") ? "anime"
    : baseUrl.endsWith("/manga") ? "manga"
    : baseUrl.endsWith("/tv") ? "tv"
    : baseUrl.endsWith("/movies") ? "movie"
    : baseUrl.endsWith("/games") ? "game"
    : baseUrl.endsWith("/books") ? "book"
    : (entry.type?.toLowerCase() || "anime");

  return (
    <>
      <div className="relative group w-full aspect-[2/3] overflow-hidden rounded-xl bg-card border border-white/5 shadow-md transition-all duration-300 ease-out hover:-translate-y-1 lg:hover:scale-[1.03] lg:hover:shadow-xl lg:hover:shadow-purple-500/5 hover:border-white/10">
        <Link
          href={`${baseUrl}/${entry.id}`}
          prefetch={false}
          className="absolute inset-0 block cursor-pointer z-10"
        >
          <div className="absolute inset-0">
            {entry.image && (
              <Image
                src={entry.image}
                alt={entry.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 ease-out lg:group-hover:scale-105"
              />
            )}
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/45 to-transparent z-15 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3.5 pt-6 sm:pt-8 flex flex-col gap-2 z-20 transition-transform duration-300 ease-out translate-y-1 group-hover:translate-y-0">
            <h4 
              title={entry.title}
              className="peer font-semibold text-xs sm:text-sm text-white/95 line-clamp-2 hover:line-clamp-none leading-snug group-hover:text-primary transition-colors duration-300 tracking-wide break-words order-2 cursor-pointer"
            >
              {entry.title}
            </h4>

            <div className="flex items-center gap-1.5 order-1 transition-all duration-300 ease-out peer-hover:opacity-0 peer-hover:-translate-y-1 peer-hover:pointer-events-none">
              {entry.progress !== undefined && entry.progress !== null && entry.progress > 0 && inferredType !== "movie" && (
                <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:py-1 bg-primary/10 text-[color-mix(in_srgb,var(--primary)_60%,white)] border border-primary/20 text-[10px] sm:text-xs font-semibold backdrop-blur-md">
                  {getProgressIcon(inferredType)}
                  <span>{entry.progress}</span>
                </span>
              )}
              {entry.score !== undefined && entry.score !== null && entry.score > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-2 py-0.5 sm:py-1 bg-primary/10 text-[color-mix(in_srgb,var(--primary)_60%,white)] border border-primary/20 text-[10px] sm:text-xs font-semibold backdrop-blur-md">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                  <span>{entry.score}</span>
                </span>
              )}
            </div>
          </div>
        </Link>

        {isOwner && (
          <div className="absolute top-2 right-2 z-30 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:group-hover:scale-100 scale-95">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-black/45 hover:bg-black/60 border border-white/10 hover:border-primary/30 text-white/90 hover:text-white backdrop-blur-md transition-all cursor-pointer pointer-events-auto flex items-center justify-center p-0"
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

      {/* Your Edit Dialogs go here... */}
    </>
  );
};