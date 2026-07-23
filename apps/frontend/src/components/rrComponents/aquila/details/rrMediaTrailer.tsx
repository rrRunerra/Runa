"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

interface MediaTrailerProps {
  trailer?: {
    id?: string | null;
    site?: string | null;
    thumbnail?: string | null;
  } | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaTrailer({
  trailer,
}: MediaTrailerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  if (!trailer || !trailer.id) {
    return null;
  }

  const isYouTube = !trailer.site || trailer.site.toLowerCase() === "youtube";
  const embedUrl = isYouTube
    ? `https://www.youtube-nocookie.com/embed/${trailer.id}?autoplay=1`
    : null;
  const thumbnailUrl =
    trailer.thumbnail ||
    (isYouTube
      ? `https://img.youtube.com/vi/${trailer.id}/hqdefault.jpg`
      : null);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl p-5 space-y-3 h-full flex flex-col justify-between"
    >
      <h3 className="text-base font-bold text-foreground">
        {t("aquila.trailer")}
      </h3>

      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-border/20 group cursor-pointer">
        {isPlaying && embedUrl ? (
          <iframe
            src={embedUrl}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full border-0"
          />
        ) : (
          <div
            className="size-full relative flex items-center justify-center"
            onClick={() => setIsPlaying(true)}
          >
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt="Trailer Thumbnail"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
              />
            ) : null}

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />

            {/* Play Button */}
            <div className="relative z-10 size-12 sm:size-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-primary transition-all duration-300">
              <Play className="size-6 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
