"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Crown, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { RankedMediaItem } from "@/types/aquila";
import { cn } from "@/lib/utils";
import RrLapplandImageNotFound from "../../rrImages/rrLapplandImageNotFound";

interface RrRankingsGridCardProps {
  item: RankedMediaItem;
  type: string;
  index: number;
}

export const RrRankingsGridCard: React.FC<RrRankingsGridCardProps> = ({
  item,
  type,
  index,
}) => {
  const safeType =
    type === "movies"
      ? "movies"
      : type === "games"
        ? "games"
        : type === "books"
          ? "books"
          : type;

  const rank = item.rank;
  const isGold = rank === 1;
  const isSilver = rank === 2;
  const isBronze = rank === 3;
  const isTop10 = rank >= 4 && rank <= 10;

  const scoreValue =
    item.externalScore !== undefined && item.externalScore !== null
      ? item.externalScore
      : item.averageScore;
  const scoreMax = item.externalScoreMax || 100;
  const scoreSource = item.externalScoreSource || "Aquila";

  const scorePercent = scoreValue
    ? Math.min(100, Math.max(0, (scoreValue / scoreMax) * 100))
    : 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.96 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.25,
            delay: Math.min(0.3, index * 0.02),
          },
        },
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col gap-2 rounded-2xl w-full h-full"
    >
      <Link
        href={`/aquila/${safeType}/${item.id}`}
        className="flex flex-col gap-2 h-full"
      >
        {/* Poster Container with Badges */}
        <div className="relative aspect-3/4 w-full overflow-hidden rounded-2xl bg-muted border border-border/50 shadow-xs group-hover:shadow-lg group-hover:border-border transition-all">
          {item.coverImage ? (
            <Image
              src={item.coverImage}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-muted/30">
              <RrLapplandImageNotFound className="size-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Gradient Overlay for badges */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/40 opacity-70 group-hover:opacity-60 transition-opacity" />

          {/* Rank Badge Ribbon on Top-Left */}
          <div className="absolute top-2.5 left-2.5 z-10">
            {isGold ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-black font-black text-xs shadow-lg shadow-amber-500/40 border border-amber-200">
                <Crown className="size-3 text-black fill-black" />
                <span>#1</span>
              </div>
            ) : isSilver ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-linear-to-r from-slate-200 to-slate-400 text-slate-950 font-black text-xs shadow-md border border-slate-100">
                <span>#2</span>
              </div>
            ) : isBronze ? (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-linear-to-r from-amber-600 to-amber-800 text-white font-black text-xs shadow-md border border-amber-600">
                <span>#3</span>
              </div>
            ) : isTop10 ? (
              <div className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md border border-primary/40">
                <span>#{rank}</span>
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white font-semibold text-xs border border-white/20">
                <span>#{rank}</span>
              </div>
            )}
          </div>

          {/* Score Badge on Top-Right */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg backdrop-blur-md text-xs font-bold shadow-md border",
                scorePercent >= 85
                  ? "bg-emerald-500/80 text-white border-emerald-400/40"
                  : scorePercent >= 70
                    ? "bg-primary/80 text-white border-primary/40"
                    : scorePercent >= 50
                      ? "bg-amber-500/80 text-black border-amber-400/40"
                      : "bg-black/60 text-white border-white/20",
              )}
            >
              <Star className="size-3 fill-current shrink-0" />
              <span>
                {scoreValue !== null && scoreValue !== undefined
                  ? scoreMax === 10 || scoreMax === 5
                    ? scoreValue.toFixed(1)
                    : Math.round(scoreValue)
                  : "—"}
              </span>
            </div>
          </div>

          {/* Bottom Overlay Info inside poster */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-1 text-[11px] text-white/90">
            <span className="font-medium bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
              {item.format
                ? item.format.replace(/_/g, " ")
                : type.toUpperCase()}
            </span>
            {item.year && (
              <span className="font-medium bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                {item.season ? `${item.season} ${item.year}` : item.year}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-0.5 px-0.5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.secondaryTitle ? (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {item.secondaryTitle}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {scoreSource}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};
