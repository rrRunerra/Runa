"use client";

import React, { useRef, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/fetcher";
import RrLapplandImageNotFound from "@/components/rrComponents/rrImages/rrLapplandImageNotFound";

export interface SimilarItemEntity {
  id: number | string;
  title: string;
  coverImage?: string | null;
  type: string;
}

interface RrMediaSimilarProps {
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  mediaId: string | number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

function getMediaHref(type: string, id: string | number): string {
  const lower = type.toLowerCase();
  switch (lower) {
    case "anime":
      return `/aquila/anime/${id}`;
    case "manga":
      return `/aquila/manga/${id}`;
    case "movie":
      return `/aquila/movies/${id}`;
    case "tv":
      return `/aquila/tv/${id}`;
    case "game":
      return `/aquila/games/${id}`;
    case "book":
      return `/aquila/books/${id}`;
    default:
      return `/aquila/${lower}/${id}`;
  }
}

export function RrMediaSimilar({
  mediaType,
  mediaId,
}: RrMediaSimilarProps): React.JSX.Element {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const endpoint = mediaId
    ? `${process.env.NEXT_PUBLIC_API_URL}/${mediaType}/${mediaId}/similar`
    : null;

  const { data: items, isLoading } = useSWR<SimilarItemEntity[]>(
    endpoint,
    fetcher,
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">
          {t("aquila.similarSeries")}
        </h3>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`similar-skel-${idx}`}
              className="w-35 sm:w-40 shrink-0 space-y-2"
            >
              <div className="w-full aspect-2/3 rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <></>;
  }

  return (
    <motion.div variants={itemVariants} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">
          {t("aquila.similarSeries")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-full bg-card/40 border-border/30 hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7 rounded-full bg-card/40 border-border/30 hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory pt-0.5 scroll-smooth"
      >
        {items.map((item, idx) => {
          const href = getMediaHref(item.type || mediaType, item.id);
          return (
            <Link
              key={`similar-${item.id}-${idx}`}
              href={href}
              prefetch={false}
              className="group shrink-0 w-32.5 sm:w-37.5 snap-start focus:outline-none"
            >
              <div className="relative w-full aspect-2/3 rounded-xl overflow-hidden bg-card/40 border border-border/30 group-hover:border-primary/50 transition-all duration-300 shadow-xs group-hover:shadow-md">
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 130px, 150px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="size-full bg-muted/30 text-muted-foreground/60 overflow-hidden flex items-center justify-center">
                    <RrLapplandImageNotFound className="size-full object-cover scale-150" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
