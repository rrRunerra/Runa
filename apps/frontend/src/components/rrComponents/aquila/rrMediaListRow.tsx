"use client";

import React, { useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { RrMediaEntry } from "./rrMediaListDisplay";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RrMediaEditDialog } from "./rrMediaEditDialog";

export interface RrMediaListRowProps {
  entry: RrMediaEntry;
  baseUrl: string;
  isOwner?: boolean;
  onRefresh?: () => void;
}

function RrMediaListRowComponent({
  entry,
  baseUrl,
  isOwner,
  onRefresh,
}: RrMediaListRowProps): React.JSX.Element {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
              : (entry.type?.toLowerCase() as any) || "anime";

  const dialogMedia = {
    id: entry.id.toString(),
    type: inferredType,
    title: { romaji: entry.title },
    coverImage: { large: entry.image },
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between w-full hover:bg-muted/30 rounded-xl pr-2 transition-all group/row">
        <Link
          href={`${baseUrl}/${entry.id}`}
          prefetch={false}
          className="flex-1 flex cursor-pointer items-center justify-between gap-4 py-2 px-2 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-12 w-8.5 shrink-0 overflow-hidden rounded-lg bg-muted aspect-2/3 shadow-sm border border-border/10">
              {entry.image && (
                <Image
                  src={entry.image}
                  alt={entry.title}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              )}
            </div>
            <span className="font-semibold text-xs text-foreground group-hover/row:text-primary transition-colors truncate">
              {entry.title}
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6 text-xs text-muted-foreground w-[100px] md:w-[120px] justify-end shrink-0">
            <span className="w-8 text-right font-bold text-foreground/80">
              {entry.score && entry.score > 0 ? entry.score : "-"}
            </span>
            <span className="w-12 text-right">
              {entry.progress !== undefined ? entry.progress : "-"}
            </span>
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
        <RrMediaEditDialog
          media={dialogMedia}
          hasListEntry={true}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={handleRefresh}
          onDeleted={handleRefresh}
        />
      )}
    </>
  );
}

export const RrMediaListRow = memo(
  RrMediaListRowComponent,
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
