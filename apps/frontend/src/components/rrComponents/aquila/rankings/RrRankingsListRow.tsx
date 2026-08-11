"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Crown,
  Medal,
  Star,
  Users,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RankedMediaItem } from "@/types/aquila";
import { cn } from "@/lib/utils";
import RrLapplandImageNotFound from "../../rrImages/rrLapplandImageNotFound";

interface RrRankingsListRowProps {
  item: RankedMediaItem;
  type: string;
  index: number;
}

export const RrRankingsListRow: React.FC<RrRankingsListRowProps> = ({
  item,
  type,
  index,
}) => {
  const { t } = useTranslation();
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

  // Format score based on externalScore or averageScore
  const scoreValue =
    item.externalScore !== undefined && item.externalScore !== null
      ? item.externalScore
      : item.averageScore;
  const scoreMax = item.externalScoreMax || 100;
  const scoreSource = item.externalScoreSource || "Aquila";

  // Score percentage for progress bar
  const scorePercent = scoreValue
    ? Math.min(100, Math.max(0, (scoreValue / scoreMax) * 100))
    : 0;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.25,
            delay: Math.min(0.3, index * 0.02),
          },
        },
      }}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-300",
        isGold &&
          "bg-linear-to-r from-amber-500/10 via-background to-card border-amber-500/40 shadow-md shadow-amber-500/5 hover:border-amber-500/60",
        isSilver &&
          "bg-linear-to-r from-slate-300/10 via-background to-card border-slate-300/40 shadow-sm hover:border-slate-300/60",
        isBronze &&
          "bg-linear-to-r from-amber-700/10 via-background to-card border-amber-700/40 shadow-sm hover:border-amber-700/60",
        isTop10 &&
          "bg-card/70 hover:bg-card border-primary/30 hover:border-primary/50",
        !isGold &&
          !isSilver &&
          !isBronze &&
          !isTop10 &&
          "bg-card/40 hover:bg-card border-border/50 hover:border-border/80",
      )}
    >
      {/* Left side: Rank Badge + Poster + Title & Info */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        {/* Rank Badge */}
        <div className="flex items-center justify-center shrink-0 w-9 sm:w-11">
          {isGold ? (
            <div className="relative flex items-center justify-center size-9 sm:size-11 rounded-2xl bg-linear-to-br from-amber-300 via-amber-400 to-amber-600 text-black font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 border border-amber-200">
              <Crown className="absolute -top-2.5 -right-1 size-4 text-amber-300 fill-amber-300 drop-shadow animate-bounce" />
              <span>1</span>
            </div>
          ) : isSilver ? (
            <div className="flex items-center justify-center size-9 sm:size-11 rounded-2xl bg-linear-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-900 font-black text-sm sm:text-base shadow-md border border-slate-100">
              <span>2</span>
            </div>
          ) : isBronze ? (
            <div className="flex items-center justify-center size-9 sm:size-11 rounded-2xl bg-linear-to-br from-amber-600 via-amber-700 to-amber-900 text-amber-100 font-black text-sm sm:text-base shadow-md border border-amber-600">
              <span>3</span>
            </div>
          ) : isTop10 ? (
            <div className="flex items-center justify-center size-8 sm:size-10 rounded-xl bg-primary/15 text-primary font-bold text-xs sm:text-sm border border-primary/30">
              <span>#{rank}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center size-7 sm:size-9 rounded-xl bg-muted/60 text-muted-foreground font-semibold text-xs sm:text-sm border border-border/50">
              <span>#{rank}</span>
            </div>
          )}
        </div>

        {/* Media Cover Poster */}
        <Link
          href={`/aquila/${safeType}/${item.id}`}
          className="relative aspect-2/3 w-14 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/60 shadow-xs group-hover:shadow-md transition-all"
        >
          {item.coverImage ? (
            <Image
              src={item.coverImage}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="64px"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-muted/30">
              <RrLapplandImageNotFound className="size-6 text-muted-foreground/50" />
            </div>
          )}
        </Link>

        {/* Media Details */}
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          <Link
            href={`/aquila/${safeType}/${item.id}`}
            className="group-hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base font-semibold text-foreground"
            title={item.title}
          >
            {item.title}
          </Link>

          {item.secondaryTitle && (
            <p className="text-xs text-muted-foreground line-clamp-1 -mt-0.5">
              {item.secondaryTitle}
            </p>
          )}

          {/* Badges & Metadata Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {item.format && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-medium bg-background/60 border-border/60"
              >
                {item.format.replace(/_/g, " ")}
              </Badge>
            )}

            {item.year && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] font-medium bg-background/60 border-border/60"
              >
                {item.season ? `${item.season} ${item.year}` : item.year}
              </Badge>
            )}

            {item.status && (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-medium border-border/60",
                  item.status === "FINISHED" || item.status === "RELEASED"
                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                    : item.status === "RELEASING" ||
                        item.status === "CONTINUING"
                      ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                      : "text-muted-foreground bg-muted/30",
                )}
              >
                {item.status.replace(/_/g, " ")}
              </Badge>
            )}

            {/* Genres preview */}
            {Array.isArray(item.genres) &&
              item.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="hidden md:inline-flex text-[11px] text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded-md"
                >
                  {g}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Right side: Score Metric + Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/30">
        {/* Score Display Card */}
        <div className="flex flex-col items-start sm:items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {scoreSource}
            </span>
            <div
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs sm:text-sm border shadow-xs",
                scorePercent >= 85
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : scorePercent >= 70
                    ? "bg-primary/15 text-primary border-primary/30"
                    : scorePercent >= 50
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-muted/40 text-muted-foreground border-border/50",
              )}
            >
              <Star className="size-3 fill-current shrink-0" />
              <span>
                {scoreValue !== null && scoreValue !== undefined
                  ? scoreMax === 10 || scoreMax === 5
                    ? scoreValue.toFixed(1)
                    : Math.round(scoreValue)
                  : "N/A"}
              </span>
              {scoreMax && (
                <span className="text-[10px] opacity-60 font-normal">
                  /{scoreMax}
                </span>
              )}
            </div>
          </div>

          {/* Popularity / Scored Count */}
          {item.scoredCount || item.popularity ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="size-2.5 shrink-0" />
              <span>
                {(item.scoredCount || item.popularity || 0).toLocaleString()}{" "}
                users
              </span>
            </div>
          ) : null}
        </div>

        {/* Action Button */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 px-3 rounded-xl text-xs font-medium gap-1 bg-background/80 hover:bg-primary hover:text-primary-foreground border-border/60 transition-all"
        >
          <Link href={`/aquila/${safeType}/${item.id}`}>
            <span className="hidden sm:inline">
              {t("aquila.rankings.viewDetails")}
            </span>
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};
