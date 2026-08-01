"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

interface RrMediaEditDialogHeaderProps {
  bannerImage?: string;
  coverImageLarge?: string;
  title: string;
  mediaType: string;
  isFavorited: boolean;
  isSubmittingFavorite: boolean;
  isSubmitting: boolean;
  onToggleFavorite: () => void;
  onSave: () => void;
}

export function RrMediaEditDialogHeader({
  bannerImage,
  coverImageLarge,
  title,
  mediaType,
  isFavorited,
  isSubmittingFavorite,
  isSubmitting,
  onToggleFavorite,
  onSave,
}: RrMediaEditDialogHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-muted">
      {/* Banner background image */}
      {bannerImage ? (
        <img
          src={bannerImage}
          alt={t("aquila.userCoverAlt")}
          className="w-full h-full object-cover transition-opacity"
        />
      ) : (
        <div className="w-full h-full bg-muted" />
      )}

      {/* Smooth gradient shadow overlay from bottom to top for title contrast */}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />

      {/* Header content container */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex items-end gap-3 sm:gap-5 z-10">
        {/* Poster cover image */}
        <div className="relative group shrink-0">
          {coverImageLarge ? (
            <img
              src={coverImageLarge}
              alt={t("aquila.userCoverAlt")}
              className="relative w-20 sm:w-24 aspect-2/3 rounded-2xl shadow-lg object-cover bg-background border border-border shrink-0"
            />
          ) : (
            <div className="relative w-20 sm:w-24 aspect-2/3 rounded-2xl shadow-lg bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
              <RrLapplandImageNotFound className="size-full object-cover scale-125" />
            </div>
          )}
        </div>

        {/* Title & Badge */}
        <div className="flex-1 min-w-0 pb-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="uppercase text-[9px] font-extrabold tracking-wider bg-primary/10 text-primary border-primary/25 rounded-full px-2.5 py-0.5 shadow-2xs"
            >
              <Sparkles className="mr-1 size-2.5 inline-block text-primary" />
              {mediaType}
            </Badge>
          </div>
          <h2 className="text-base sm:text-xl font-bold tracking-tight line-clamp-2 text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {title}
          </h2>
        </div>

        {/* Header Action Buttons */}
        <div className="pb-1 flex gap-2 sm:gap-3 items-center shrink-0">
          {/* Favorite button */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleFavorite}
            disabled={isSubmittingFavorite}
            className={cn(
              "size-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer shadow-2xs",
              isFavorited
                ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25 shadow-destructive/10"
                : "bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            aria-label={t("aquila.toggleFavorite")}
          >
            <Heart
              className={cn(
                "size-5 transition-transform",
                isFavorited && "fill-current scale-110",
              )}
            />
          </motion.button>

          {/* Save button */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-bold px-4 sm:px-6 rounded-xl cursor-pointer h-10 text-xs sm:text-sm"
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  {t("aquila.saving")}
                </>
              ) : (
                t("aquila.save")
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
