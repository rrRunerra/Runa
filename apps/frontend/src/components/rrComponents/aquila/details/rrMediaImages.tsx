"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Maximize2, X, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AnimeEntity } from "@/types/anime.entities";

export interface MediaImageItem {
  id: string;
  url: string;
  category: "poster" | "background" | "banner" | "screencap";
  provider?: string;
  title?: string;
  aspectRatio?: "poster" | "banner" | "landscape";
}

interface RrMediaImagesProps {
  anime: AnimeEntity;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaImages({ anime }: RrMediaImagesProps): React.JSX.Element {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const imagesList = useMemo(() => {
    const list: MediaImageItem[] = [];
    const seen = new Set<string>();

    const addImage = (
      url: string | null | undefined,
      category: "poster" | "background" | "banner" | "screencap",
      provider?: string,
      title?: string,
      aspectRatio?: "poster" | "banner" | "landscape"
    ) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push({
        id: `${category}-${list.length}`,
        url,
        category,
        provider,
        title,
        aspectRatio: aspectRatio || (category === "poster" ? "poster" : category === "banner" ? "banner" : "landscape"),
      });
    };

    // Main Cover & Banner
    if (anime.coverImage) addImage(anime.coverImage, "poster", "Cover", anime.titlePrimary, "poster");
    if (anime.bannerImage) addImage(anime.bannerImage, "banner", "Banner", anime.titlePrimary, "banner");

    // AniList Cover & Banner
    if (anime.images?.anilist?.cover?.extraLarge) addImage(anime.images.anilist.cover.extraLarge, "poster", "AniList", "Extra Large Cover", "poster");
    if (anime.images?.anilist?.banner) addImage(anime.images.anilist.banner, "banner", "AniList", "Banner", "banner");

    // MAL Pictures
    if (anime.images?.mal?.pictures && Array.isArray(anime.images.mal.pictures)) {
      anime.images.mal.pictures.forEach((pic, i) => addImage(pic, "poster", "MyAnimeList", `MAL Picture ${i + 1}`, "poster"));
    }

    // TVDB Posters
    if (anime.images?.tvdb?.posters && Array.isArray(anime.images.tvdb.posters)) {
      anime.images.tvdb.posters.forEach((pic, i) => addImage(pic, "poster", "TheTVDB", `TVDB Poster ${i + 1}`, "poster"));
    }

    // TVDB Backgrounds
    if (anime.images?.tvdb?.backgrounds && Array.isArray(anime.images.tvdb.backgrounds)) {
      anime.images.tvdb.backgrounds.forEach((pic, i) => addImage(pic, "background", "TheTVDB", `TVDB Background ${i + 1}`, "landscape"));
    }

    // TVDB Banners
    if (anime.images?.tvdb?.banners && Array.isArray(anime.images.tvdb.banners)) {
      anime.images.tvdb.banners.forEach((pic, i) => addImage(pic, "banner", "TheTVDB", `TVDB Banner ${i + 1}`, "banner"));
    }

    // Episode Screencaps
    if (anime.episodes && Array.isArray(anime.episodes)) {
      anime.episodes.forEach((ep) => {
        if (ep.thumbnail) {
          const epTitle = ep.titlePrimary || ep.titleSecondary || `Episode ${ep.number}`;
          addImage(ep.thumbnail, "screencap", "Episode", `EP ${ep.number}: ${epTitle}`, "landscape");
        }
      });
    }

    return list;
  }, [anime]);

  const filteredImages = useMemo(() => {
    if (selectedCategory === "all") return imagesList;
    return imagesList.filter((img) => img.category === selectedCategory);
  }, [imagesList, selectedCategory]);

  if (imagesList.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-card/45 border border-border/30 rounded-2xl">
        {t("aquila.noImages", "No gallery images available")}
      </div>
    );
  }

  const handlePrev = () => {
    if (lightboxIndex == null) return;
    setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : filteredImages.length - 1));
  };

  const handleNext = () => {
    if (lightboxIndex == null) return;
    setLightboxIndex((prev) => (prev! < filteredImages.length - 1 ? prev! + 1 : 0));
  };

  const currentLightboxImage = lightboxIndex != null ? filteredImages[lightboxIndex] : null;

  return (
    <motion.div variants={itemVariants} className="space-y-5">
      {/* Category filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          variant={selectedCategory === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("all")}
          className="rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          <Layers className="size-3.5 mr-1" />
          {t("aquila.allImages", "All Images")} ({imagesList.length})
        </Button>
        <Button
          variant={selectedCategory === "poster" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("poster")}
          className="rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          {t("aquila.posters", "Posters & Covers")} (
          {imagesList.filter((i) => i.category === "poster").length})
        </Button>
        <Button
          variant={selectedCategory === "background" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("background")}
          className="rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          {t("aquila.backgrounds", "Backgrounds")} (
          {imagesList.filter((i) => i.category === "background").length})
        </Button>
        <Button
          variant={selectedCategory === "banner" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("banner")}
          className="rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          {t("aquila.banners", "Banners")} (
          {imagesList.filter((i) => i.category === "banner").length})
        </Button>
        <Button
          variant={selectedCategory === "screencap" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("screencap")}
          className="rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          {t("aquila.screencaps", "Screencaps")} (
          {imagesList.filter((i) => i.category === "screencap").length})
        </Button>
      </div>

      {/* Image Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredImages.map((img, idx) => {
          const isPoster = img.aspectRatio === "poster";
          const isBanner = img.aspectRatio === "banner";

          return (
            <div
              key={img.id}
              onClick={() => setLightboxIndex(idx)}
              className={cn(
                "group relative rounded-2xl overflow-hidden bg-card/45 border border-border/30 cursor-pointer shadow-xs hover:border-primary/50 transition-all duration-300",
                isPoster ? "aspect-2/3" : isBanner ? "aspect-21/9 col-span-2" : "aspect-16/9"
              )}
            >
              <Image
                src={img.url}
                alt={img.title || "Gallery Image"}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white">
                    <Maximize2 className="size-3.5" />
                  </div>
                </div>
                <div>
                  {img.provider && (
                    <Badge variant="secondary" className="text-[9px] py-0 px-1.5 mb-1 rounded-md">
                      {img.provider}
                    </Badge>
                  )}
                  {img.title && (
                    <p className="text-xs font-bold text-white truncate" title={img.title}>
                      {img.title}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Preview Modal */}
      <Dialog open={lightboxIndex != null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent className="sm:max-w-none w-fit max-w-[95vw] max-h-[92vh] bg-background/95 border-border/40 backdrop-blur-2xl p-3 sm:p-5 rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-3 shadow-2xl">
          <DialogTitle className="sr-only">
            {currentLightboxImage?.title || "Image Lightbox"}
          </DialogTitle>

          {currentLightboxImage && (
            <div className="relative flex items-center justify-center max-w-[85vw] max-h-[75vh] overflow-hidden">
              <img
                src={currentLightboxImage.url}
                alt={currentLightboxImage.title || "Preview"}
                className="max-h-[75vh] max-w-[85vw] w-auto h-auto object-contain rounded-xl shadow-xl transition-all duration-300"
              />

              {/* Prev / Next controls */}
              {filteredImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full size-10 bg-black/60 border-white/20 text-white hover:bg-black/80 cursor-pointer z-10 shadow-md"
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full size-10 bg-black/60 border-white/20 text-white hover:bg-black/80 cursor-pointer z-10 shadow-md"
                  >
                    <ChevronRight className="size-6" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Footer info */}
          {currentLightboxImage && (
            <div className="w-full flex items-center justify-between px-2 pt-1 border-t border-border/30 text-xs text-muted-foreground gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {currentLightboxImage.provider && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {currentLightboxImage.provider}
                  </Badge>
                )}
                <span className="font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                  {currentLightboxImage.title}
                </span>
              </div>
              <span className="shrink-0 font-medium tabular-nums">
                {lightboxIndex! + 1} / {filteredImages.length}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
