"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
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
    <div className="relative h-48 w-full bg-muted/10">
      {bannerImage && (
        <img
          src={bannerImage}
          alt={t("aquila.userCoverAlt")}
          className="w-full h-full object-cover opacity-50"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
      <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 sm:gap-6 z-10">
        {coverImageLarge ? (
          <img
            src={coverImageLarge}
            alt={t("aquila.userCoverAlt")}
            className="w-20 sm:w-24 aspect-2/3 rounded-xl shadow-2xl object-cover bg-background/40 border border-border/40 shrink-0"
          />
        ) : (
          <div className="w-20 sm:w-24 aspect-2/3 rounded-xl shadow-2xl bg-muted border border-border/40 overflow-hidden flex items-center justify-center shrink-0 relative">
            <RrLapplandImageNotFound className="size-full object-cover scale-150" />
          </div>
        )}
        <div className="flex-1 pb-1">
          <h2 className="text-sm sm:text-xl font-bold line-clamp-2 text-foreground drop-shadow-md">
            {title}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="secondary"
              className="uppercase text-[9px] font-bold"
            >
              {mediaType}
            </Badge>
          </div>
        </div>
        <div className="pb-1 flex gap-3 sm:gap-4 items-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleFavorite}
            disabled={isSubmittingFavorite}
            className={cn(
              "transition-colors cursor-pointer p-1.5 rounded-full hover:bg-muted/30",
              isFavorited
                ? "text-red-500 hover:text-red-600 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("size-6", isFavorited && "fill-current")} />
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 font-bold px-5 sm:px-6 rounded-xl cursor-pointer"
              onClick={onSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("aquila.saving") : t("aquila.save")}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
