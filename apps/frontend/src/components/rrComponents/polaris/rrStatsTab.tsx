import React, { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Clock, Star, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";
import RrStatsDashboard from "@/components/rrComponents/polaris/rrStatsDashboard";

interface StatsTabProps {
  name: string;
}

export default function RrStatsTab({ name }: StatsTabProps): React.ReactNode {
  const { t } = useTranslation();
  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}/stats/${name}`;
  
  const { data: animeStats, isLoading: l1 } = useSWR<any>(`${baseUrl}/anime`, fetcher);
  const { data: mangaStats, isLoading: l2 } = useSWR<any>(`${baseUrl}/manga`, fetcher);
  const { data: tvStats,    isLoading: l3 } = useSWR<any>(`${baseUrl}/tv`,    fetcher);
  const { data: movieStats, isLoading: l4 } = useSWR<any>(`${baseUrl}/movie`, fetcher);
  const { data: gameStats,  isLoading: l5 } = useSWR<any>(`${baseUrl}/game`,  fetcher);
  const { data: bookStats,  isLoading: l6 } = useSWR<any>(`${baseUrl}/book`,  fetcher);

  const loading = l1 || l2 || l3 || l4 || l5 || l6;

  const globalStats = useMemo(() => {
    if (loading) return null;

    let totalItems = 0;
    let totalScore = 0;
    let scoredItemsCount = 0;
    let totalHours = 0;
    let totalEpisodes = 0;
    let totalChapters = 0;

    const allStats = [animeStats, mangaStats, tvStats, movieStats, gameStats, bookStats];

    allStats.forEach((stat) => {
      if (!stat) return;
      
      totalItems += stat.count || 0;
      
      let scoredCount = 0;
      if (stat.scoreDistribution && typeof stat.scoreDistribution === "object") {
        scoredCount = Object.values(stat.scoreDistribution).reduce(
          (acc: number, val: any) => acc + (Number(val) || 0),
          0
        );
      } else if (stat.meanScore > 0) {
        scoredCount = stat.count || 1;
      }

      if (stat.meanScore > 0 && scoredCount > 0) {
        const normalizedMean = stat.meanScore > 10 ? stat.meanScore / 10 : Number(stat.meanScore);
        totalScore += normalizedMean * scoredCount;
        scoredItemsCount += scoredCount;
      }
    });

    // Time calculations
    if (animeStats?.daysWatched) totalHours += animeStats.daysWatched * 24;
    if (tvStats?.hoursWatched) totalHours += tvStats.hoursWatched;
    if (movieStats?.hoursWatched) totalHours += movieStats.hoursWatched;
    if (gameStats?.hoursPlayed) totalHours += gameStats.hoursPlayed;
    
    // Manga and Books time calculation
    if (mangaStats?.chaptersRead) totalHours += mangaStats.chaptersRead / 12; // 12 chapters an hour
    if (bookStats?.chaptersRead) totalHours += bookStats.chaptersRead / 3;    // 3 chapters an hour

    // Episodes and Chapters
    if (animeStats?.episodesWatched) totalEpisodes += animeStats.episodesWatched;
    if (tvStats?.episodesWatched) totalEpisodes += tvStats.episodesWatched;
    
    if (mangaStats?.chaptersRead) totalChapters += mangaStats.chaptersRead;
    if (bookStats?.chaptersRead) totalChapters += bookStats.chaptersRead;

    const globalMeanScore = scoredItemsCount > 0 ? (totalScore / scoredItemsCount).toFixed(2) : "0.00";
    const totalDaysSpent = totalHours / 24;

    return {
      totalItems,
      globalMeanScore,
      totalHours: Math.round(totalHours).toLocaleString(),
      totalDaysSpent: totalDaysSpent.toFixed(1),
      totalEpisodes: totalEpisodes.toLocaleString(),
      totalChapters: totalChapters.toLocaleString()
    };
  }, [animeStats, mangaStats, tvStats, movieStats, gameStats, bookStats, loading]);

  return (
    <div className="space-y-8">
      {/* Global Overview Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight">{t("polaris.stats.globalOverview")}</h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : globalStats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.totalLibrary")}</p>
                  <p className="text-2xl font-black">{globalStats.totalItems}</p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.meanScore")}</p>
                  <p className="text-2xl font-black">{globalStats.globalMeanScore}</p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.daysSpent")}</p>
                  <p className="text-2xl font-black">{globalStats.totalDaysSpent}</p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.hoursSpent")}</p>
                  <p className="text-2xl font-black">{globalStats.totalHours}</p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.totalEpisodes")}</p>
                  <p className="text-2xl font-black">{globalStats.totalEpisodes}</p>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full gap-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("polaris.stats.totalChapters")}</p>
                  <p className="text-2xl font-black">{globalStats.totalChapters}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex items-center gap-2 mt-2 px-1">
              <span className="text-[11px] text-muted-foreground italic">
                {t("polaris.stats.readingEstimate")}
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className="border-t pt-8">
        <RrStatsDashboard username={name} />
      </div>
    </div>
  );
}
