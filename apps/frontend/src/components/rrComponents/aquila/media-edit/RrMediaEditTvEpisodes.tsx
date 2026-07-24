"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Check, Info } from "lucide-react";
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
    <div className="flex flex-col gap-2">
      {!canToggle && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <span>
            {!hasListEntry
              ? t("aquila.saveThisShowToTrack")
              : t("aquila.setStatusToTrack")}
          </span>
        </div>
      )}
      <div className="max-h-86.25 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {seasons && seasons.length > 0 ? (
          seasons.map((season) => {
            const watchedInSeason = season.episodes.filter((ep: any) =>
              watchedEpisodes.some(
                (w) =>
                  w.seasonNum === season.number && w.episodeNum === ep.number,
              ),
            ).length;
            const isSeasonCompleted = watchedInSeason === season.episodeCount;
            const isSeasonExpanded = expandedSeasonNum === season.number;

            return (
              <div
                key={`season-${season.number}`}
                className="border border-border/40 rounded-xl bg-muted/10 overflow-hidden"
              >
                {/* Season Header */}
                <div
                  className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer select-none hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    onExpandedSeasonNumChange(
                      isSeasonExpanded ? null : season.number,
                    )
                  }
                >
                  <div className="flex items-center gap-2.5">
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
                    <Label
                      htmlFor={`season-${season.number}-completed`}
                      className="font-bold text-xs sm:text-sm text-foreground cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {season.name ||
                        t("aquila.seasonName", { number: season.number })}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isSeasonCompleted ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {watchedInSeason} / {season.episodeCount} Ep
                    </Badge>
                    {isSeasonExpanded ? (
                      <ChevronUp className="size-3.5 text-muted-foreground/60 shrink-0" />
                    ) : (
                      <ChevronDown className="size-3.5 text-muted-foreground/60 shrink-0" />
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
                      className="overflow-hidden border-t border-border/40"
                    >
                      <div className="p-3 max-h-48 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {season.episodes.map((ep: any) => {
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
                                "flex items-center justify-between p-2 rounded-lg border text-left transition-all duration-200 text-xs font-semibold",
                                canToggle
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-50",
                                isEpWatched
                                  ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                                  : "bg-background border-border hover:bg-muted/50 text-foreground",
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
                                <Check className="size-3.5 shrink-0" />
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
          <div className="text-center py-8 text-xs text-muted-foreground bg-muted/10 border border-dashed border-border rounded-xl">
            {t("aquila.noSeasonsAvailable")}
          </div>
        )}
      </div>
    </div>
  );
}
