"use client";

import React, { useState, useEffect } from "react";
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
  ListPlus
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
  Cell
} from "recharts";

interface StatsDashboardProps {
  username: string;
}

type MediaType = "anime" | "manga" | "tv" | "movie" | "game" | "book";

const MEDIA_CONFIG: Record<
  MediaType,
  { title: string; icon: React.ReactNode; color: string }
> = {
  anime: { title: "Anime", icon: <Play className="w-4 h-4" />, color: "#a855f7" },
  manga: { title: "Manga", icon: <BookOpen className="w-4 h-4" />, color: "#c084fc" },
  tv: { title: "TV Shows", icon: <Tv className="w-4 h-4" />, color: "#818cf8" },
  movie: { title: "Movies", icon: <Film className="w-4 h-4" />, color: "#38bdf8" },
  game: { title: "Games", icon: <Gamepad2 className="w-4 h-4" />, color: "#f43f5e" },
  book: { title: "Books", icon: <Book className="w-4 h-4" />, color: "#fb7185" },
};

const PIE_COLORS = ["#a855f7", "#64748b", "#f97316", "#06b6d4", "#ec4899", "#10b981"];

export default function StatsDashboard({ username }: StatsDashboardProps): React.JSX.Element {
  const [activeMedia, setActiveMedia] = useState<MediaType>("anime");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/stats/${username}/${activeMedia}`
        );
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("This statistics page is private.");
          }
          throw new Error("Failed to load statistics.");
        }
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [username, activeMedia]);

  const renderStatsOverview = () => {
    if (!stats) return null;

    const cards: { title: string; value: string | number; desc: string; icon: React.ReactNode }[] = [];

    if (activeMedia === "anime") {
      cards.push(
        { title: "Total Anime", value: stats.count || 0, desc: "Titles in list", icon: <BarChart2 className="w-4 h-4 text-purple-400" /> },
        { title: "Episodes Watched", value: stats.episodesWatched || 0, desc: "Total progress", icon: <Play className="w-4 h-4 text-purple-400" /> },
        { title: "Days Watched", value: stats.daysWatched || 0, desc: "Total time spent", icon: <Clock className="w-4 h-4 text-purple-400" /> },
        { title: "Hours Planned", value: stats.hoursPlanned || 0, desc: "In planning list", icon: <ListPlus className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    } else if (activeMedia === "manga") {
      cards.push(
        { title: "Total Manga", value: stats.count || 0, desc: "Titles in list", icon: <BarChart2 className="w-4 h-4 text-purple-400" /> },
        { title: "Chapters Read", value: stats.chaptersRead || 0, desc: "Total progress", icon: <BookOpen className="w-4 h-4 text-purple-400" /> },
        { title: "Volumes Read", value: stats.volumesRead || 0, desc: "Total volumes completed", icon: <Book className="w-4 h-4 text-purple-400" /> },
        { title: "Chapters Planned", value: stats.chaptersPlanned || 0, desc: "In planning list", icon: <ListPlus className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    } else if (activeMedia === "tv") {
      cards.push(
        { title: "Total TV Shows", value: stats.count || 0, desc: "Shows in list", icon: <BarChart2 className="w-4 h-4 text-purple-400" /> },
        { title: "Episodes Watched", value: stats.episodesWatched || 0, desc: "Total progress", icon: <Play className="w-4 h-4 text-purple-400" /> },
        { title: "Hours Watched", value: stats.hoursWatched || 0, desc: "Total watch time", icon: <Clock className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    } else if (activeMedia === "movie") {
      cards.push(
        { title: "Total Movies", value: stats.count || 0, desc: "Movies in list", icon: <BarChart2 className="w-4 h-4 text-purple-400" /> },
        { title: "Hours Watched", value: stats.hoursWatched || 0, desc: "Completed watch time", icon: <Clock className="w-4 h-4 text-purple-400" /> },
        { title: "Hours Planned", value: stats.hoursPlanned || 0, desc: "In planning list", icon: <ListPlus className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    } else if (activeMedia === "game") {
      cards.push(
        { title: "Total Games", value: stats.count || 0, desc: "Games in list", icon: <Gamepad2 className="w-4 h-4 text-purple-400" /> },
        { title: "Hours Played", value: stats.hoursPlayed || 0, desc: "Total gameplay time", icon: <Clock className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    } else if (activeMedia === "book") {
      cards.push(
        { title: "Total Books", value: stats.count || 0, desc: "Books in list", icon: <BookOpen className="w-4 h-4 text-purple-400" /> },
        { title: "Chapters Read", value: stats.chaptersRead || 0, desc: "Total chapters progress", icon: <Book className="w-4 h-4 text-purple-400" /> },
        { title: "Volumes Read", value: stats.volumesRead || 0, desc: "Total volumes completed", icon: <ListPlus className="w-4 h-4 text-purple-400" /> },
        { title: "Pages Read", value: stats.pagesRead || 0, desc: "Completed books pages", icon: <CheckCircle className="w-4 h-4 text-purple-400" /> },
        { title: "Mean Score", value: stats.meanScore || "0.0", desc: "Average rating", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
        { title: "Standard Deviation", value: stats.standardDeviation || "0.0", desc: "Rating spread", icon: <HelpCircle className="w-4 h-4 text-purple-400" /> }
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3.5 p-4 rounded-2xl border border-border/40 bg-card/25 shadow-md backdrop-blur-xs select-none hover:border-primary/10 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </div>
              <div className="text-xl font-black text-white mt-0.5 leading-none">
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

  const renderDistributionList = (dist: Record<string, number>, total: number) => {
    if (!dist || Object.keys(dist).length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-xs italic text-muted-foreground">
          No distribution data.
        </div>
      );
    }

    const sorted = Object.entries(dist)
      .map(([name, val]) => ({ name, value: val }))
      .sort((a, b) => b.value - a.value);

    const pieData = sorted.slice(0, 6);
    const otherVal = sorted.slice(6).reduce((acc, curr) => acc + curr.value, 0);
    if (otherVal > 0) {
      pieData.push({ name: "Other", value: otherVal });
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
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center select-none pointer-events-none">
            <span className="text-xl font-black text-white leading-none">{total}</span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Total</span>
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
                  <span className="font-semibold text-zinc-300 truncate max-w-[140px]">{item.name}</span>
                  <span className="font-bold text-white">{pct}%</span>
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
        <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="size-10 text-muted-foreground/40 stroke-1" />
          <div className="text-sm font-semibold text-white">No statistics calculated yet</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Add items and update your progress list to see statistics graphs here.
          </p>
        </Card>
      );
    }

    if (!mounted) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      );
    }

    // Prepare score distribution data for Recharts BarChart
    const scoreData = Object.entries(stats.scoreDistribution || {}).map(([score, count]) => ({
      name: score,
      count: count as number,
    }));

    // Prepare progress/count distribution data if available
    const progressData = stats.episodeCountDistribution 
      ? Object.entries(stats.episodeCountDistribution).map(([range, count]) => ({
          name: range,
          count: count as number,
        }))
      : stats.chapterCountDistribution
      ? Object.entries(stats.chapterCountDistribution).map(([range, count]) => ({
          name: range,
          count: count as number,
        }))
      : null;

    return (
      <div className="space-y-6">
        {/* Score and Count Range Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Chart */}
          <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="99%" height={224} debounce={100}>
                  <BarChart data={scoreData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontSize: "11px" }}
                      labelStyle={{ fontWeight: "bold", color: "#a855f7" }}
                      cursor={{ fill: "rgba(168, 85, 247, 0.04)" }}
                    />
                    <Bar dataKey="count" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Episode / Chapter Count Range Chart */}
          {progressData && (
            <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">
                  {activeMedia === "anime" ? "Episode Count" : "Chapter Count"} Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="h-56 w-full min-w-0">
                  <ResponsiveContainer width="99%" height={224} debounce={100}>
                    <BarChart data={progressData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "12px", fontSize: "11px" }}
                        labelStyle={{ fontWeight: "bold", color: "#a855f7" }}
                        cursor={{ fill: "rgba(168, 85, 247, 0.04)" }}
                      />
                      <Bar dataKey="count" fill="#c084fc" radius={[6, 6, 0, 0]} maxBarSize={35} />
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
            <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">Format Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {renderDistributionList(stats.formatDistribution, stats.count)}
              </CardContent>
            </Card>
          )}

          {/* Status Distribution */}
          {stats.statusDistribution && (
            <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {renderDistributionList(stats.statusDistribution, stats.count)}
              </CardContent>
            </Card>
          )}

          {/* Country Distribution */}
          {stats.countryDistribution && (
            <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xs font-bold uppercase tracking-wider">Country Distribution</CardTitle>
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
          <TabsList className="bg-card/20 border border-border/40 p-1 rounded-2xl w-full flex flex-wrap h-auto justify-start gap-1">
            {(Object.keys(MEDIA_CONFIG) as MediaType[]).map((type) => {
              const config = MEDIA_CONFIG[type];
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 shrink-0"
                >
                  {config.icon}
                  <span>{config.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        <div 
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground/35 select-none hover:text-muted-foreground/60 transition-colors pl-2 cursor-help w-fit" 
          title="Statistics are compiled and cached in the background. Metrics and distributions may temporarily deviate during rapid updates or imports."
        >
          <HelpCircle className="w-3 h-3 stroke-[1.5]" />
          <span>Stats are cached and updated periodically | May not be 100% accurate</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        <Card className="border-border/40 bg-card/25 backdrop-blur-xs rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <HelpCircle className="size-10 text-red-400 stroke-1" />
          <div className="text-sm font-semibold text-white">{error}</div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Make sure your list is public or check back again later.
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
