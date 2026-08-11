"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useTranslation } from "react-i18next";
import {
  Tv,
  BookOpen,
  Gamepad2,
  Film,
  Book,
  Play,
  BarChart2,
  HelpCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  ListPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface StatsDashboardProps {
  username: string;
}

type MediaType = "anime" | "manga" | "tv" | "movie" | "game" | "book";

const MEDIA_CONFIG: Record<
  MediaType,
  { titleKey: string; icon: React.ReactNode; color: string }
> = {
  anime: {
    titleKey: "anime",
    icon: <Play className="w-4 h-4" />,
    color: "var(--chart-1)",
  },
  manga: {
    titleKey: "manga",
    icon: <BookOpen className="w-4 h-4" />,
    color: "var(--chart-2)",
  },
  tv: { titleKey: "tv", icon: <Tv className="w-4 h-4" />, color: "var(--chart-3)" },
  movie: {
    titleKey: "movie",
    icon: <Film className="w-4 h-4" />,
    color: "var(--chart-4)",
  },
  game: {
    titleKey: "game",
    icon: <Gamepad2 className="w-4 h-4" />,
    color: "var(--chart-5)",
  },
  book: {
    titleKey: "book",
    icon: <Book className="w-4 h-4" />,
    color: "var(--chart-1)",
  },
};

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function RrStatsDashboard({
  username,
}: StatsDashboardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [activeMedia, setActiveMedia] = useState<MediaType>("anime");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: stats, isLoading: loading, error: swrError } = useSWR<any>(
    username ? `${process.env.NEXT_PUBLIC_API_URL}/stats/${username}/${activeMedia}` : null,
    fetcher
  );

  const error = swrError
    ? swrError.message === "Request failed"
      ? t("polaris.stats.privateOrFailed")
      : swrError.message
    : null;

  const renderStatsOverview = () => {
    if (!stats) return null;

    const cards: {
      title: string;
      value: string | number;
      desc: string;
      icon: React.ReactNode;
    }[] = [];

    if (activeMedia === "anime") {
      cards.push(
        {
          title: t("polaris.stats.totalAnime"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <BarChart2 className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.episodesWatched"),
          value: stats.episodesWatched || 0,
          desc: t("polaris.stats.totalProgress"),
          icon: <Play className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.daysWatched"),
          value: stats.daysWatched || 0,
          desc: t("polaris.stats.totalTimeSpent"),
          icon: <Clock className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.hoursPlanned"),
          value: stats.hoursPlanned || 0,
          desc: t("polaris.stats.inPlanningList"),
          icon: <ListPlus className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    } else if (activeMedia === "manga") {
      cards.push(
        {
          title: t("polaris.stats.totalManga"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <BarChart2 className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.chaptersRead"),
          value: stats.chaptersRead || 0,
          desc: t("polaris.stats.totalProgress"),
          icon: <BookOpen className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.volumesRead"),
          value: stats.volumesRead || 0,
          desc: t("polaris.stats.totalVolumesCompleted"),
          icon: <Book className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.chaptersPlanned"),
          value: stats.chaptersPlanned || 0,
          desc: t("polaris.stats.inPlanningList"),
          icon: <ListPlus className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    } else if (activeMedia === "tv") {
      cards.push(
        {
          title: t("polaris.stats.totalTvShows"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <BarChart2 className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.episodesWatched"),
          value: stats.episodesWatched || 0,
          desc: t("polaris.stats.totalProgress"),
          icon: <Play className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.hoursWatched"),
          value: stats.hoursWatched || 0,
          desc: t("polaris.stats.totalWatchTime"),
          icon: <Clock className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    } else if (activeMedia === "movie") {
      cards.push(
        {
          title: t("polaris.stats.totalMovies"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <BarChart2 className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.hoursWatched"),
          value: stats.hoursWatched || 0,
          desc: t("polaris.stats.completedWatchTime"),
          icon: <Clock className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.hoursPlanned"),
          value: stats.hoursPlanned || 0,
          desc: t("polaris.stats.inPlanningList"),
          icon: <ListPlus className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    } else if (activeMedia === "game") {
      cards.push(
        {
          title: t("polaris.stats.totalGames"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <Gamepad2 className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.hoursPlayed"),
          value: stats.hoursPlayed || 0,
          desc: t("polaris.stats.totalGameplayTime"),
          icon: <Clock className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    } else if (activeMedia === "book") {
      cards.push(
        {
          title: t("polaris.stats.totalBooks"),
          value: stats.count || 0,
          desc: t("polaris.stats.titlesInList"),
          icon: <BookOpen className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.chaptersRead"),
          value: stats.chaptersRead || 0,
          desc: t("polaris.stats.totalChaptersProgress"),
          icon: <Book className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.volumesRead"),
          value: stats.volumesRead || 0,
          desc: t("polaris.stats.totalVolumesCompleted"),
          icon: <ListPlus className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.pagesRead"),
          value: stats.pagesRead || 0,
          desc: t("polaris.stats.completedBooksPages"),
          icon: <CheckCircle className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.meanScore"),
          value: stats.meanScore || "0.0",
          desc: t("polaris.stats.averageRating"),
          icon: <TrendingUp className="w-4 h-4 text-primary" />,
        },
        {
          title: t("polaris.stats.stdDev"),
          value: stats.standardDeviation || "0.0",
          desc: t("polaris.stats.ratingSpread"),
          icon: <HelpCircle className="w-4 h-4 text-primary" />,
        },
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3.5 p-4 rounded-xl border bg-card shadow-sm select-none hover:border-primary/30 transition-all"
          >
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </div>
              <div className="text-xl font-black text-foreground mt-0.5 leading-none">
                {card.value}
              </div>
              <div className="text-[9px] text-muted-foreground/80 mt-1 truncate">
                {card.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDistributionList = (
    dist: Record<string, number>,
    total: number,
  ) => {
    if (!dist || Object.keys(dist).length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-xs italic text-muted-foreground">
          {t("polaris.stats.noDistributionData")}
        </div>
      );
    }

    const formatName = (rawName: string) => {
      const key = rawName.toLowerCase();
      switch (key) {
        case "watching":
        case "current":
          return t("aquila.watching", "Watching");
        case "reading":
          return t("aquila.reading", "Reading");
        case "playing":
          return t("aquila.playing", "Playing");
        case "completed":
          return t("aquila.completed", "Completed");
        case "on_hold":
        case "paused":
          return t("aquila.onHold", "On Hold");
        case "dropped":
          return t("aquila.dropped", "Dropped");
        case "planning":
          return t("aquila.planning", "Planning");
        default:
          return rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    };

    const sorted = Object.entries(dist)
      .map(([name, val]) => ({ name: formatName(name), value: Math.round(Number(val) || 0) }))
      .sort((a, b) => b.value - a.value);

    const pieData = sorted.slice(0, 6);
    const otherVal = sorted.slice(6).reduce((acc, curr) => acc + curr.value, 0);
    if (otherVal > 0) {
      pieData.push({ name: t("polaris.lists.other", "Other"), value: otherVal });
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Pie/Donut Chart */}
        <div className="h-40 relative flex justify-center items-center min-w-0">
          <ResponsiveContainer width="99%" height={160} debounce={100}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center select-none pointer-events-none">
            <span className="text-xl font-black text-foreground leading-none">
              {total}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-1">
              {t("polaris.stats.total")}
            </span>
          </div>
        </div>

        {/* Legend with Bars */}
        <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
          {sorted.slice(0, 5).map((item, idx) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            const color = PIE_COLORS[idx % PIE_COLORS.length];
            return (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-muted-foreground truncate max-w-[140px]">
                    {item.name}
                  </span>
                  <span className="font-bold text-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    if (!stats || stats.count === 0) {
      return (
        <Card className="border shadow-sm bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="size-10 text-muted-foreground/40 stroke-1" />
          <div className="text-sm font-semibold text-foreground">
            {t("polaris.stats.noStatsCalculated")}
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            {t("polaris.stats.addItemsToSee")}
          </p>
        </Card>
      );
    }

    if (!mounted) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      );
    }

    // Prepare score distribution data for Recharts BarChart (round to nearest whole numbers 1-10)
    const scoreDistMap: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) {
      scoreDistMap[i.toString()] = 0;
    }
    if (stats.scoreDistribution) {
      Object.entries(stats.scoreDistribution).forEach(([score, count]) => {
        const rounded = Math.min(10, Math.max(1, Math.round(Number(score))));
        if (!isNaN(rounded)) {
          scoreDistMap[rounded.toString()] =
            (scoreDistMap[rounded.toString()] || 0) + (Number(count) || 0);
        }
      });
    }

    const scoreData = Object.entries(scoreDistMap).map(([score, count]) => ({
      name: score,
      count: Math.round(count),
    }));

    // Prepare progress/count distribution data if available
    const progressData = stats.episodeCountDistribution
      ? Object.entries(stats.episodeCountDistribution).map(
          ([range, count]) => ({
            name: range,
            count: count as number,
          }),
        )
      : stats.chapterCountDistribution
        ? Object.entries(stats.chapterCountDistribution).map(
            ([range, count]) => ({
              name: range,
              count: count as number,
            }),
          )
        : null;

    return (
      <div className="space-y-6">
        {/* Score and Count Range Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Chart */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider">
                {t("polaris.stats.scoreDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="99%" height={224} debounce={100}>
                  <BarChart
                    data={scoreData}
                    margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                      labelStyle={{ fontWeight: "bold", color: "var(--primary)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                      cursor={{ fill: "var(--primary)", opacity: 0.04 }}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Episode / Chapter Count Range Chart */}
          {progressData && (
            <Card className="border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider">
                  {activeMedia === "anime"
                    ? t("polaris.stats.episodeCountDistribution")
                    : t("polaris.stats.chapterCountDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="h-56 w-full min-w-0">
                  <ResponsiveContainer width="99%" height={224} debounce={100}>
                    <BarChart
                      data={progressData}
                      margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "12px",
                          fontSize: "11px",
                        }}
                        labelStyle={{ fontWeight: "bold", color: "var(--primary)" }}
                        itemStyle={{ color: "var(--foreground)" }}
                        cursor={{ fill: "var(--primary)", opacity: 0.04 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--chart-2)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={35}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Formats, Status, and Country Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Format Distribution */}
          {stats.formatDistribution && (
            <Card className="border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider">
                  {t("polaris.stats.formatDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderDistributionList(stats.formatDistribution, stats.count)}
              </CardContent>
            </Card>
          )}

          {/* Status Distribution */}
          {stats.statusDistribution && (
            <Card className="border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider">
                  {t("polaris.stats.statusDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderDistributionList(stats.statusDistribution, stats.count)}
              </CardContent>
            </Card>
          )}

          {/* Country Distribution */}
          {stats.countryDistribution && (
            <Card className="border shadow-sm bg-card md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-xs font-bold uppercase tracking-wider">
                  {t("polaris.stats.countryDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderDistributionList(stats.countryDistribution, stats.count)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Media Type Tab Bar */}
      <div className="space-y-2">
        <Tabs
          value={activeMedia}
          onValueChange={(v) => setActiveMedia(v as MediaType)}
          className="w-full shrink-0"
        >
          <TabsList className="bg-muted border p-1 rounded-lg w-full flex flex-nowrap overflow-x-auto no-scrollbar h-auto justify-start gap-1">
            {(Object.keys(MEDIA_CONFIG) as MediaType[]).map((type) => {
              const config = MEDIA_CONFIG[type];
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm shrink-0"
                >
                  {config.icon}
                  <span>{t(`polaris.stats.${config.titleKey}`)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 select-none hover:text-muted-foreground/80 transition-colors pl-2 cursor-help w-fit"
          title={t("polaris.stats.statsCachedTooltip")}
        >
          <HelpCircle className="w-3 h-3 stroke-[1.5]" />
          <span>
            {t("polaris.stats.statsCached")}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <Card className="border shadow-sm bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="size-10 text-red-400 stroke-1" />
          <div className="text-sm font-semibold text-foreground">{error}</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            {t("polaris.stats.makeSurePublic")}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderStatsOverview()}
          {renderCharts()}
        </div>
      )}
    </div>
  );
}
