"use client";

import React, { useMemo } from "react";
import { Star, Heart, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface RrMediaStatsDashboardProps {
  localAverageScore?: number | null;
  localPopularity?: number | null;
  localFavoritesCount?: number | null;
  localStatusDistribution?: Record<string, number> | null;
  localScoreDistribution?: Record<string, number> | null;
  showCounters?: boolean;
  alAverageScore?: number | null;
  alFavorites?: number | null;
  alPopularity?: number | null;
  malAverageScore?: number | null;
  malFavorites?: number | null;
  malPopularity?: number | null;
  maxScore?: number;
  mediaType?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const formatCompactNum = (num: number | null | undefined): string => {
  if (num == null || isNaN(num)) return "0";
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "b";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
};

const STATUS_COLORS: Record<string, string> = {
  // Watching / Reading / Playing
  WATCHING: "bg-blue-500/70",
  READING: "bg-blue-500/70",
  PLAYING: "bg-blue-500/70",
  // Planning
  PLANNING: "bg-amber-500/70",
  // Completed
  COMPLETED: "bg-emerald-500/70",
  // On Hold
  ON_HOLD: "bg-purple-500/70",
  // Dropped
  DROPPED: "bg-rose-500/70",
};

export function RrMediaStatsDashboard({
  localAverageScore = 0,
  localPopularity = 0,
  localFavoritesCount = 0,
  localStatusDistribution = {},
  localScoreDistribution = {},
  showCounters = true,
  alAverageScore,
  alFavorites,
  alPopularity,
  malAverageScore,
  malFavorites,
  malPopularity,
  maxScore,
  mediaType,
}: RrMediaStatsDashboardProps): React.JSX.Element {
  const { t } = useTranslation();

  const effectiveMaxScore =
    maxScore ?? (mediaType?.toLowerCase() === "game" ? 100 : 10);

  // Helper to translate status distribution names
  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "WATCHING":
        return t("aquila.watching");
      case "READING":
        return t("aquila.reading");
      case "PLAYING":
        return t("aquila.playing");
      case "ON_HOLD":
        return t("aquila.onHold");
      case "COMPLETED":
        return t("aquila.completed");
      case "DROPPED":
        return t("aquila.dropped");
      default:
        return status.replace(/_/g, " ").toLowerCase();
    }
  };

  // 1. Prepare score data
  const scoreData = useMemo(() => {
    const scores = Array.from({ length: 10 }, (_, i) => String(i + 1));
    return scores.map((score) => ({
      name: score,
      count: localScoreDistribution?.[score] || 0,
    }));
  }, [localScoreDistribution]);

  const hasScoreData = useMemo(() => {
    return scoreData.some((d) => d.count > 0);
  }, [scoreData]);

  // 2. Prepare status distribution percentages
  const parsedStatusData = useMemo(() => {
    const dist: Record<string, number> = {};
    if (localStatusDistribution) {
      for (const [k, v] of Object.entries(localStatusDistribution)) {
        dist[k.toUpperCase()] = Number(v);
      }
    }

    const currentCount =
      (dist["WATCHING"] || 0) + (dist["PLAYING"] || 0) + (dist["READING"] || 0);
    const planningCount = dist["PLANNING"] || 0;
    const droppedCount = dist["DROPPED"] || 0;
    const pausedCount = dist["ON_HOLD"] || 0;
    const completedCount = dist["COMPLETED"] || 0;

    const total =
      currentCount +
      planningCount +
      droppedCount +
      pausedCount +
      completedCount;

    return {
      current: {
        count: currentCount,
        percent: total > 0 ? (currentCount / total) * 100 : 0,
      },
      planning: {
        count: planningCount,
        percent: total > 0 ? (planningCount / total) * 100 : 0,
      },
      dropped: {
        count: droppedCount,
        percent: total > 0 ? (droppedCount / total) * 100 : 0,
      },
      paused: {
        count: pausedCount,
        percent: total > 0 ? (pausedCount / total) * 100 : 0,
      },
      completed: {
        count: completedCount,
        percent: total > 0 ? (completedCount / total) * 100 : 0,
      },
      total,
    };
  }, [localStatusDistribution]);

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {/* Counters Grid */}
      {showCounters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Score Card */}
          <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Star className="size-4 text-primary fill-primary/20" />
              <span>{t("aquila.averageRating")}</span>
            </div>
            <div className="border-t border-border/20 pt-3 flex flex-col">
              <span className="text-[10px] text-muted-foreground font-medium">
                {t("aquila.localRating")}
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {localAverageScore
                  ? `${localAverageScore.toFixed(1)} / ${effectiveMaxScore}`
                  : t("aquila.notAvailable")}
              </span>
            </div>
          </div>

          {/* Favorites / Popularity Card */}
          <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Heart className="size-4 text-primary fill-primary/20" />
              <span>{t("aquila.communityReach")}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-medium leading-none mb-1">
                  {t("aquila.localFavorites")}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {localFavoritesCount?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex flex-col border-l border-border/20 pl-4">
                <span className="text-[10px] text-muted-foreground font-medium leading-none mb-1">
                  {t("aquila.listCount")}
                </span>
                <span className="text-lg font-bold text-foreground flex items-center gap-1">
                  <Users className="size-3 text-muted-foreground" />
                  {localPopularity?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* External Platform Stats Card */}
      {(alAverageScore != null ||
        alFavorites != null ||
        alPopularity != null ||
        malAverageScore != null ||
        malFavorites != null ||
        malPopularity != null) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">
            {t("aquila.externalStats", "External Platform Ratings & Stats")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AniList Card */}
            {(alAverageScore != null || alFavorites != null || alPopularity != null) && (
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-2xl flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-xs font-extrabold text-sky-400 tracking-wide uppercase">
                    AniList
                  </span>
                  {alAverageScore != null && (
                    <span className="text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                      {alAverageScore}% ({ (alAverageScore / 10).toFixed(1) } / 10)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("aquila.favorites", "Favorites")}
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatCompactNum(alFavorites)}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-border/20 pl-3">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("aquila.popularity", "Popularity")}
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatCompactNum(alPopularity)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MyAnimeList Card */}
            {(malAverageScore != null || malFavorites != null || malPopularity != null) && (
              <div className="bg-card/45 border border-border/30 backdrop-blur-md p-4 rounded-2xl flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-xs font-extrabold text-blue-400 tracking-wide uppercase">
                    MyAnimeList
                  </span>
                  {malAverageScore != null && (
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                      {(malAverageScore / 100).toFixed(2)} / 10
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("aquila.favorites", "Favorites")}
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatCompactNum(malFavorites)}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-border/20 pl-3">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {t("aquila.popularity", "Popularity")}
                    </span>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatCompactNum(malPopularity)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Distributions Grid */}
      {(parsedStatusData.total > 0 || hasScoreData) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">
              {t("aquila.statusDistribution")}
            </h3>
            <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex flex-col justify-between h-30 w-full shadow-sm">
              {/* Status Pill Columns */}
              <div className="flex justify-between items-center w-full gap-2">
                {/* Current */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-lg bg-[#52d629] whitespace-nowrap">
                    {t("aquila.current")}
                  </span>
                  <div className="text-[10px] whitespace-nowrap text-center">
                    <span className="font-bold text-[#52d629] mr-0.5">
                      {parsedStatusData.current.count}
                    </span>
                    <span className="text-muted-foreground/80">Users</span>
                  </div>
                </div>

                {/* Paused (On Hold) */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-lg bg-[#f75284] whitespace-nowrap">
                    {t("aquila.paused")}
                  </span>
                  <div className="text-[10px] whitespace-nowrap text-center">
                    <span className="font-bold text-[#f75284] mr-0.5">
                      {parsedStatusData.paused.count}
                    </span>
                    <span className="text-muted-foreground/80">Users</span>
                  </div>
                </div>

                {/* Completed */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-lg bg-[#e0415a] whitespace-nowrap">
                    {t("aquila.completed")}
                  </span>
                  <div className="text-[10px] whitespace-nowrap text-center">
                    <span className="font-bold text-[#e0415a] mr-0.5">
                      {parsedStatusData.completed.count}
                    </span>
                    <span className="text-muted-foreground/80">Users</span>
                  </div>
                </div>

                {/* Dropped */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-lg bg-[#8d4bf2] whitespace-nowrap">
                    {t("aquila.dropped")}
                  </span>
                  <div className="text-[10px] whitespace-nowrap text-center">
                    <span className="font-bold text-[#8d4bf2] mr-0.5">
                      {parsedStatusData.dropped.count}
                    </span>
                    <span className="text-muted-foreground/80">Users</span>
                  </div>
                </div>

                {/* Planning */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-lg bg-[#1ea6fc] whitespace-nowrap">
                    {t("aquila.planning")}
                  </span>
                  <div className="text-[10px] whitespace-nowrap text-center">
                    <span className="font-bold text-[#1ea6fc] mr-0.5">
                      {parsedStatusData.planning.count}
                    </span>
                    <span className="text-muted-foreground/80">Users</span>
                  </div>
                </div>
              </div>

              {/* Segment Bar */}
              <div className="h-2.5 w-full rounded-full bg-muted/20 overflow-hidden flex">
                {parsedStatusData.current.percent > 0 && (
                  <div
                    className="bg-[#52d629]"
                    style={{ width: `${parsedStatusData.current.percent}%` }}
                  />
                )}
                {parsedStatusData.paused.percent > 0 && (
                  <div
                    className="bg-[#f75284]"
                    style={{ width: `${parsedStatusData.paused.percent}%` }}
                  />
                )}
                {parsedStatusData.completed.percent > 0 && (
                  <div
                    className="bg-[#e0415a]"
                    style={{ width: `${parsedStatusData.completed.percent}%` }}
                  />
                )}
                {parsedStatusData.dropped.percent > 0 && (
                  <div
                    className="bg-[#8d4bf2]"
                    style={{ width: `${parsedStatusData.dropped.percent}%` }}
                  />
                )}
                {parsedStatusData.planning.percent > 0 && (
                  <div
                    className="bg-[#1ea6fc]"
                    style={{ width: `${parsedStatusData.planning.percent}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Score Distribution */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">
              {t("aquila.scoreDistribution", "Score Distribution")}
            </h3>
            <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex items-end justify-between w-full h-30 pb-4 px-6 gap-2 shadow-sm">
              {scoreData.map((d, index) => {
                const maxScoreCount = Math.max(
                  ...scoreData.map((s) => s.count),
                  1,
                );
                const heightPercent =
                  maxScoreCount > 0 ? (d.count / maxScoreCount) * 100 : 0;
                const barColors = [
                  "bg-[#e0415a]",
                  "bg-[#f06a3a]",
                  "bg-[#f08b3a]",
                  "bg-[#f0ac3a]",
                  "bg-[#f0c43a]",
                  "bg-[#d2d433]",
                  "bg-[#b9d92b]",
                  "bg-[#9cd92b]",
                  "bg-[#79d92b]",
                  "bg-[#52d629]",
                ];
                const colorClass = barColors[index] || "bg-muted-foreground";

                return (
                  <div
                    key={d.name}
                    className="flex flex-col items-center gap-1 group relative flex-1 cursor-pointer"
                    style={{ height: "100%" }}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                      <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border border-border whitespace-nowrap">
                        Score {d.name}: {d.count} Users
                      </div>
                      <div className="w-1.5 h-1.5 bg-popover border-r border-b border-border rotate-45 -mt-1" />
                    </div>

                    {/* Vertical capsule bar */}
                    <div className="w-full flex-1 flex items-end justify-center min-h-10">
                      <div
                        className={`w-3 rounded-full ${colorClass} transition-all duration-300 group-hover:brightness-110`}
                        style={{ height: `${Math.max(8, heightPercent)}%` }}
                        title={`Score ${d.name}: ${d.count} Users`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
