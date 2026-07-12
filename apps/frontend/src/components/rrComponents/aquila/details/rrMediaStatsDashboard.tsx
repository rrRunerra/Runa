"use client";

import React, { useMemo } from "react";
import { Star, Heart, Users, BarChart3, Award } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RrMediaStatsDashboardProps {
  localAverageScore?: number | null;
  localPopularity?: number | null;
  localFavoritesCount?: number | null;
  localStatusDistribution?: Record<string, number> | null;
  localScoreDistribution?: Record<string, number> | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
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
}: RrMediaStatsDashboardProps): React.JSX.Element {
  // 1. Prepare score data for Recharts
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
  const statusEntries = useMemo(() => {
    if (!localStatusDistribution) return [];
    const entries = Object.entries(localStatusDistribution).filter(
      ([_, val]) => val > 0,
    );
    const total = entries.reduce((sum, [_, val]) => sum + val, 0);
    return entries.map(([status, count]) => ({
      status,
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [localStatusDistribution]);

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {/* Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Card */}
        <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Star className="size-4 text-primary fill-primary/20" />
            <span>Average Rating</span>
          </div>
          <div className="border-t border-border/20 pt-3 flex flex-col">
            <span className="text-[10px] text-muted-foreground font-medium">
              Local Rating
            </span>
            <span className="text-2xl font-extrabold text-primary">
              {localAverageScore ? `${localAverageScore.toFixed(1)} / 10` : "N/A"}
            </span>
          </div>
        </div>

        {/* Favorites / Popularity Card */}
        <div className="bg-card/45 border border-border/30 backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Heart className="size-4 text-primary fill-primary/20" />
            <span>Community Reach</span>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-border/20 pt-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-medium leading-none mb-1">
                Local Favorites
              </span>
              <span className="text-lg font-bold text-foreground">
                {localFavoritesCount?.toLocaleString() || "0"}
              </span>
            </div>
            <div className="flex flex-col border-l border-border/20 pl-4">
              <span className="text-[10px] text-muted-foreground font-medium leading-none mb-1">
                List Count
              </span>
              <span className="text-lg font-bold text-foreground flex items-center gap-1">
                <Users className="size-3 text-muted-foreground" />
                {localPopularity?.toLocaleString() || "0"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distributions Grid */}
      {(statusEntries.length > 0 || hasScoreData) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution */}
          {statusEntries.length > 0 && (
            <Card className="bg-card/35 border-border/30 shadow-xs rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Award className="size-4 text-primary/80" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Visual Segment Bar */}
                <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden flex">
                  {statusEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className={
                        STATUS_COLORS[entry.status] || "bg-muted-foreground/60"
                      }
                      style={{ width: `${entry.percent}%` }}
                      title={`${entry.status}: ${entry.count} (${entry.percent.toFixed(1)}%)`}
                    />
                  ))}
                </div>
                {/* Labels List */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {statusEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1 bg-muted/10 rounded-lg"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={`size-2 rounded-full ${STATUS_COLORS[entry.status] || "bg-muted-foreground/60"}`}
                        />
                        <span className="capitalize truncate text-muted-foreground text-[10px]">
                          {entry.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </div>
                      <span className="font-bold text-[10px]">
                        {entry.count} ({entry.percent.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score Distribution Chart */}
          {hasScoreData && (
            <Card className="bg-card/35 border-border/30 shadow-xs rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary/80" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreData}
                      margin={{ top: 5, right: 5, left: -30, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 8 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 8 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "10px",
                          fontSize: "10px",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--primary)"
                        radius={[2, 2, 0, 0]}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
