"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, Calculator, TrendingUp, Heart, Star, BarChart3, Clock } from "lucide-react";

export interface RrSubmissionInternalMetricsTabProps {
  mediaType: string;
  initialData: Record<string, any>;
}

export function RrSubmissionInternalMetricsTab({
  mediaType,
  initialData = {},
}: RrSubmissionInternalMetricsTabProps): React.JSX.Element {
  const formatJson = (val: any) => {
    if (!val) return "{}";
    if (typeof val === "string") return val;
    try {
      return JSON.stringify(val);
    } catch {
      return "{}";
    }
  };

  const formatDate = (val: any) => {
    if (!val) return "N/A";
    if (typeof val === "number") return new Date(val * 1000).toLocaleString();
    try {
      return new Date(val).toLocaleString();
    } catch {
      return String(val);
    }
  };

  return (
    <div className="space-y-6 m-0 opacity-85">
      {/* Banner explaining these are read-only internal metrics */}
      <div className="flex items-center gap-3 p-4 bg-muted/40 border border-border/70 rounded-2xl">
        <Calculator className="size-5 text-primary shrink-0" />
        <div>
          <div className="text-xs font-bold text-foreground flex items-center gap-2">
            System Calculated Metrics & Provider Metadata
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/50 text-amber-500 bg-amber-500/10">
              <Lock className="size-3" /> Read Only
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            These fields represent aggregate ratings, user list counts, and sync timestamps. They are automatically updated by background tasks and provider connections.
          </p>
        </div>
      </div>

      {/* Aggregate Score & Popularity Metrics */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Star className="size-4 text-amber-400" />
          Aggregate Metrics & Scores
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Average Score</Label>
            <Input
              disabled
              value={initialData.averageScore ?? "N/A"}
              className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-bold text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Favorites Count</Label>
            <Input
              disabled
              value={initialData.favorites ?? 0}
              className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-bold text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Popularity Rank / Count</Label>
            <Input
              disabled
              value={initialData.popularity ?? 0}
              className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-bold text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Total Score Sum</Label>
            <Input
              disabled
              value={initialData.totalScoreSum ?? "N/A"}
              className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-medium text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Scored Count</Label>
            <Input
              disabled
              value={initialData.scoredCount ?? "N/A"}
              className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-medium text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Media-Specific Provider Ratings */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="size-4 text-primary" />
          External Provider Ratings & Metrics
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(mediaType === "anime" || mediaType === "manga") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">AniList Average Score</Label>
                <Input disabled value={initialData.alAverageScore ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">AniList Favorites</Label>
                <Input disabled value={initialData.alFavorites ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">MAL Average Score</Label>
                <Input disabled value={initialData.malAverageScore ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
            </>
          )}

          {(mediaType === "tv" || mediaType === "movie") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">IMDb Rating</Label>
                <Input disabled value={initialData.imdbRating ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">IMDb Votes</Label>
                <Input disabled value={initialData.imdbVotes ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              {mediaType === "tv" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Rotten Tomatoes Score</Label>
                  <Input disabled value={initialData.rottenTomatoesScore ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
                </div>
              )}
            </>
          )}

          {mediaType === "game" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Metacritic Score</Label>
                <Input disabled value={initialData.metacriticScore ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">RAWG Rating</Label>
                <Input disabled value={initialData.rawgRating ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">IGDB Rating</Label>
                <Input disabled value={initialData.igdbRating ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
            </>
          )}

          {mediaType === "book" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Google Books Rating</Label>
                <Input disabled value={initialData.googleBooksRating ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Google Books Ratings Count</Label>
                <Input disabled value={initialData.googleBooksRatingsCount ?? "N/A"} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs text-muted-foreground cursor-not-allowed" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Distribution JSONs & Timestamps */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Clock className="size-4 text-primary" />
          Distributions & Update Timestamps
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Status Distribution JSON</Label>
            <Input disabled value={formatJson(initialData.statusDistribution)} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-mono text-muted-foreground cursor-not-allowed" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Score Distribution JSON</Label>
            <Input disabled value={formatJson(initialData.scoreDistribution)} className="bg-muted/60 border-border/60 rounded-xl h-10 text-xs font-mono text-muted-foreground cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40 text-xs">
          <div>
            <span className="text-muted-foreground font-semibold">Created At:</span>{" "}
            <span className="font-medium">{formatDate(initialData.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground font-semibold">Updated At:</span>{" "}
            <span className="font-medium">{formatDate(initialData.updatedAt)}</span>
          </div>
          {initialData.alUpdatedAt && (
            <div>
              <span className="text-muted-foreground font-semibold">AniList Updated:</span>{" "}
              <span className="font-medium">{formatDate(initialData.alUpdatedAt)}</span>
            </div>
          )}
          {initialData.malUpdatedAt && (
            <div>
              <span className="text-muted-foreground font-semibold">MAL Updated:</span>{" "}
              <span className="font-medium">{formatDate(initialData.malUpdatedAt)}</span>
            </div>
          )}
          {initialData.tvdbUpdatedAt && (
            <div>
              <span className="text-muted-foreground font-semibold">TVDB Updated:</span>{" "}
              <span className="font-medium">{formatDate(initialData.tvdbUpdatedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
