"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RrMediaEditTvEpisodesProps {
  seasons?: any[];
  watchedEpisodes: { seasonNum: number; episodeNum: number }[];
  expandedSeasonNum: number | null;
  onExpandedSeasonNumChange: (seasonNum: number | null) => void;
  onToggleEpisode: (seasonNum: number, episodeNum: number) => Promise<void>;
  onToggleSeason: (seasonNum: number, checked: boolean) => Promise<void>;
}

export function RrMediaEditTvEpisodes({
  seasons,
  watchedEpisodes,
  expandedSeasonNum,
  onExpandedSeasonNumChange,
  onToggleEpisode,
  onToggleSeason,
}: RrMediaEditTvEpisodesProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {seasons && seasons.length > 0 ? (
        seasons.map((season) => {
          const watchedInSeason = season.episodes.filter((ep: any) =>
            watchedEpisodes.some(
              (w) =>
                w.seasonNum === season.number &&
                w.episodeNum === ep.number,
            ),
          ).length;
          const isSeasonCompleted =
            watchedInSeason === season.episodeCount;
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
                      onCheckedChange={(checked) =>
                        onToggleSeason(season.number, checked as boolean)
                      }
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                  <Label
                    htmlFor={`season-${season.number}-completed`}
                    className="font-bold text-xs sm:text-sm text-foreground cursor-pointer select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {season.name || `Season ${season.number}`}
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
                            onClick={() =>
                              onToggleEpisode(season.number, ep.number)
                            }
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all duration-200 text-xs font-semibold",
                              isEpWatched
                                ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                                : "bg-background border-border hover:bg-muted/50 text-foreground",
                            )}
                          >
                            <span className="truncate pr-1">
                              {ep.number}. {ep.name || `Episode ${ep.number}`}
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
          No seasons/episodes details available for this show.
        </div>
      )}
    </div>
  );
}
