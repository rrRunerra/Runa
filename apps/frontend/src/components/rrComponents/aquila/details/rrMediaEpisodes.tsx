"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Film, Clock, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimeEpisodeV2Entity, AiringScheduleV2Entity } from "@/types/anime.entities";

interface RrMediaEpisodesProps {
  episodes?: AnimeEpisodeV2Entity[] | null;
  airingSchedule?: AiringScheduleV2Entity[] | null;
  showAllInitial?: boolean;
  limit?: number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export function RrMediaEpisodes({
  episodes,
  airingSchedule,
  showAllInitial = false,
  limit = 6,
}: RrMediaEpisodesProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState<boolean>(showAllInitial);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState<number | string | null>(null);

  const scheduleMap = useMemo(() => {
    const map = new Map<number, AiringScheduleV2Entity>();
    if (airingSchedule) {
      for (const item of airingSchedule) {
        map.set(item.episodeNumber, item);
      }
    }
    return map;
  }, [airingSchedule]);

  const hasEpisodes = episodes && episodes.length > 0;
  const hasSchedule = airingSchedule && airingSchedule.length > 0;

  if (!hasEpisodes && !hasSchedule) {
    return <></>;
  }

  const sortedEpisodes = episodes
    ? [...episodes].sort((a, b) => a.number - b.number)
    : [];
  const displayedEpisodes = showAll ? sortedEpisodes : sortedEpisodes.slice(0, limit);

  const toggleExpand = (id: number | string): void => {
    setExpandedEpisodeId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div variants={itemVariants} className="space-y-8">
      {/* Episodes Grid Section */}
      {hasEpisodes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Film className="size-4 text-primary" />
              <span>{t("aquila.episodesList", "Episodes")}</span>
              <Badge variant="secondary" className="ml-1 text-xs rounded-lg">
                {episodes.length}
              </Badge>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {displayedEpisodes.map((ep) => {
              const isExpanded = expandedEpisodeId === ep.id;
              const displayTitle =
                ep.titlePrimary ||
                ep.titleSecondary ||
                `${t("aquila.episode", "Episode")} ${ep.number}`;

              const sched = scheduleMap.get(ep.number);
              const rawDate = ep.airDate || sched?.airingAt;

              const formattedAirDate = rawDate
                ? new Date(rawDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <div
                  key={ep.id}
                  className="flex flex-col bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl overflow-hidden hover:border-border/50 hover:bg-accent/10 transition-all duration-300 shadow-xs"
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="relative w-28 sm:w-32 aspect-16/9 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/20 shadow-xs">
                      {ep.thumbnail ? (
                        <Image
                          src={ep.thumbnail}
                          alt={displayTitle}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center bg-muted/40 text-muted-foreground/60">
                          <Film className="size-6" />
                        </div>
                      )}
                      <div className="absolute top-1 left-1 bg-black/75 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                        EP {ep.number}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      <p
                        className="text-xs sm:text-sm font-bold text-foreground truncate"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
                        {ep.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3 text-primary/80" />
                            {ep.duration} {t("aquila.mins", "m")}
                          </span>
                        )}
                        {formattedAirDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground/80" />
                            {formattedAirDate}
                          </span>
                        )}
                      </div>

                      {/* Filler / Recap badges */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {ep.isFiller && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/40 text-amber-500 bg-amber-500/10">
                            {t("aquila.filler", "Filler")}
                          </Badge>
                        )}
                        {ep.isRecap && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-blue-500/40 text-blue-500 bg-blue-500/10">
                            {t("aquila.recap", "Recap")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expand summary button if description exists */}
                    {ep.description && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => toggleExpand(ep.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded Description */}
                  {isExpanded && ep.description && (
                    <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground/90 border-t border-border/20 bg-muted/10 leading-relaxed">
                      {ep.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Airing Schedule List Section */}
      {hasSchedule && (
        <div className="space-y-4 pt-6 border-t border-border/30">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span>{t("aquila.airingSchedule", "Airing Schedule")}</span>
              <Badge variant="secondary" className="ml-1 text-xs rounded-lg">
                {airingSchedule.length}
              </Badge>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {airingSchedule
              .slice()
              .sort((a, b) => a.episodeNumber - b.episodeNumber)
              .map((item) => {
                const date = new Date(item.airingAt);
                const isUpcoming = date > new Date();
                const formattedDate = date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const formattedTime = date.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={item.id || item.episodeNumber}
                    className="flex items-center justify-between p-3.5 bg-card/45 border border-border/30 backdrop-blur-md rounded-2xl hover:border-border/50 transition-all shadow-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-foreground">
                        {t("aquila.episode", "Episode")} {item.episodeNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3 text-primary/70" />
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    <Badge
                      variant={isUpcoming ? "default" : "secondary"}
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0",
                        isUpcoming
                          ? "bg-primary/20 text-primary border border-primary/30 animate-pulse"
                          : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {isUpcoming
                        ? t("aquila.upcoming", "Upcoming")
                        : t("aquila.aired", "Aired")}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
