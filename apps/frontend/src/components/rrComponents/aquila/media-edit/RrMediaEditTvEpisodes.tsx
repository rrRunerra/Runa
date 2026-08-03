"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Check, Info, Tv } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RrMediaEditTvEpisodesProps {
  seasons?: any[];
  watchedEpisodes: { seasonNum: number; episodeNum: number }[];
  expandedSeasonNum: number | null;
  onExpandedSeasonNumChange: (seasonNum: number | null) => void;
  onToggleEpisode: (seasonNum: number, episodeNum: number) => Promise<void>;
  onToggleSeason: (seasonNum: number, checked: boolean) => Promise<void>;
  listStatus?: string;
  hasListEntry?: boolean;
}

const ALLOWED_STATUSES = ["WATCHING", "COMPLETED"];

export function RrMediaEditTvEpisodes({
  seasons,
  watchedEpisodes,
  expandedSeasonNum,
  onExpandedSeasonNumChange,
  onToggleEpisode,
  onToggleSeason,
  listStatus,
  hasListEntry,
}: RrMediaEditTvEpisodesProps): React.JSX.Element {
  const { t } = useTranslation();
  const canToggle =
    hasListEntry === true && ALLOWED_STATUSES.includes(listStatus ?? "");
  return (
    <div className="flex flex-col gap-3">
      {!canToggle && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted border border-border text-xs font-medium text-muted-foreground shadow-2xs">
          <Info className="size-4 shrink-0 text-muted-foreground" />
          <span>
            {!hasListEntry
              ? t("aquila.saveThisShowToTrack")
              : t("aquila.setStatusToTrack")}
          </span>
        </div>
      )}
      <div className="max-h-103.75 overflow-y-auto pr-1 flex flex-col gap-2.5 w-full custom-scrollbar">
        {seasons && seasons.length > 0 ? (
          seasons.map((season) => {
            const watchedInSeason = (season.episodes ?? []).filter((ep: any) =>
              watchedEpisodes.some(
                (w) =>
                  w.seasonNum === season.number && w.episodeNum === ep.number,
              ),
            ).length;
            const isSeasonCompleted = Boolean(
              season.episodeCount &&
                season.episodeCount > 0 &&
                watchedInSeason === season.episodeCount,
            );
            const isSeasonExpanded = expandedSeasonNum === season.number;
            const seasonPercent =
              season.episodeCount && season.episodeCount > 0
                ? Math.round((watchedInSeason / season.episodeCount) * 100)
                : 0;

            return (
              <div
                key={`season-${season.number}`}
                className="border border-border/60 rounded-2xl bg-card/40 backdrop-blur-xs overflow-hidden shadow-2xs transition-all hover:border-border shrink-0"
              >
                {/* Season Header */}
                <div
                  className="flex items-center justify-between p-3.5 bg-background/50 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() =>
                    onExpandedSeasonNumChange(
                      isSeasonExpanded ? null : season.number,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        id={`season-${season.number}-completed`}
                        checked={isSeasonCompleted}
                        disabled={!canToggle}
                        onCheckedChange={(checked) =>
                          onToggleSeason(season.number, checked as boolean)
                        }
                        className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col">
                      <Label
                        htmlFor={`season-${season.number}-completed`}
                        className="font-bold text-xs sm:text-sm text-foreground cursor-pointer select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {season.name ||
                          t("aquila.seasonName", { number: season.number })}
                      </Label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant={isSeasonCompleted ? "default" : "outline"}
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                        isSeasonCompleted
                          ? "bg-primary/10 text-primary border-primary/25"
                          : "bg-muted/60 text-muted-foreground border-border/60",
                      )}
                    >
                      {watchedInSeason} / {season.episodeCount ?? "?"} Ep
                      {seasonPercent > 0 && ` (${seasonPercent}%)`}
                    </Badge>
                    {isSeasonExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>

                {/* Collapsible episode list */}
                <AnimatePresence initial={false}>
                  {isSeasonExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="overflow-hidden border-t border-border/50 bg-muted/10"
                    >
                      <div className="p-3 max-h-52 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(season.episodes ?? []).map((ep: any) => {
                          const isEpWatched = watchedEpisodes.some(
                            (w) =>
                              w.seasonNum === season.number &&
                              w.episodeNum === ep.number,
                          );
                          return (
                            <button
                              key={`ep-${season.number}-${ep.number}`}
                              type="button"
                              disabled={!canToggle}
                              onClick={() =>
                                onToggleEpisode(season.number, ep.number)
                              }
                              className={cn(
                                "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all duration-200 text-xs font-semibold",
                                canToggle
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-50",
                                isEpWatched
                                  ? "bg-primary/10 border-primary/30 text-primary shadow-2xs"
                                  : "bg-background/80 border-border/60 hover:bg-muted/60 text-foreground",
                              )}
                            >
                              <span className="truncate pr-1">
                                {ep.number}.{" "}
                                {ep.name ||
                                  t("aquila.episodeName", {
                                    number: ep.number,
                                  })}
                              </span>
                              {isEpWatched && (
                                <Check className="size-3.5 shrink-0 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-xs text-muted-foreground bg-card/40 border border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center gap-2">
            <Tv className="size-6 text-muted-foreground/50" />
            <span>{t("aquila.noSeasonsAvailable")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
