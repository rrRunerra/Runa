"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "lucide-react";

export interface RrSubmissionExternalIdsTabProps {
  mediaType: string;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function RrSubmissionExternalIdsTab({
  mediaType,
  formData,
  onChange,
}: RrSubmissionExternalIdsTabProps): React.JSX.Element {
  return (
    <div className="space-y-5 m-0">
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Database className="size-4 text-primary" />
          External Provider Database Keys & Cross-References
        </div>
        <p className="text-xs text-muted-foreground">
          Link this media entry with third-party tracking services (AniList, MyAnimeList, TheTVDB, TMDB, RAWG, Steam, Google Books, etc.).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {/* AniList ID */}
          {(mediaType === "anime" || mediaType === "manga") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                AniList ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 154587"
                value={formData.anilistId || ""}
                onChange={(e) => onChange("anilistId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* MAL ID */}
          {(mediaType === "anime" || mediaType === "manga") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                MyAnimeList (MAL) ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 52991"
                value={formData.malId || ""}
                onChange={(e) => onChange("malId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* AniDB ID */}
          {mediaType === "anime" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                AniDB ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 17617"
                value={formData.aniDBId || ""}
                onChange={(e) => onChange("aniDBId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* Bangumi ID */}
          {(mediaType === "anime" || mediaType === "manga") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Bangumi ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 396827"
                value={formData.bangumiId || ""}
                onChange={(e) => onChange("bangumiId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* MangaUpdates ID */}
          {mediaType === "manga" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                MangaUpdates ID
              </Label>
              <Input
                placeholder="e.g. 18274"
                value={formData.mangaUpdatesId || ""}
                onChange={(e) => onChange("mangaUpdatesId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* TheTVDB ID */}
          {(mediaType === "tv" || mediaType === "movie" || mediaType === "anime") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                TheTVDB ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 43210"
                value={formData.tvDBId || formData.tvdbId || ""}
                onChange={(e) => {
                  onChange("tvDBId", e.target.value);
                  onChange("tvdbId", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* IMDb ID */}
          {(mediaType === "tv" || mediaType === "movie") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                IMDb ID
              </Label>
              <Input
                placeholder="e.g. tt1234567"
                value={formData.imdbId || ""}
                onChange={(e) => onChange("imdbId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* TMDB ID */}
          {(mediaType === "tv" || mediaType === "movie") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                TMDb ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 98765"
                value={formData.tmdbId || ""}
                onChange={(e) => onChange("tmdbId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* Trakt ID */}
          {(mediaType === "tv" || mediaType === "movie") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Trakt.tv ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 19283"
                value={formData.traktId || ""}
                onChange={(e) => onChange("traktId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* TVMaze ID */}
          {mediaType === "tv" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                TVMaze ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 5432"
                value={formData.tvmazeId || ""}
                onChange={(e) => onChange("tvmazeId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* RAWG ID */}
          {mediaType === "game" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                RAWG.io ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 3498"
                value={formData.rawgId || ""}
                onChange={(e) => onChange("rawgId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* IGDB ID */}
          {mediaType === "game" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                IGDB ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 1190"
                value={formData.igdbId || ""}
                onChange={(e) => onChange("igdbId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* Steam App ID */}
          {mediaType === "game" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Steam App ID
              </Label>
              <Input
                type="number"
                placeholder="e.g. 1091500"
                value={formData.steamAppId || ""}
                onChange={(e) => onChange("steamAppId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* GiantBomb ID */}
          {mediaType === "game" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                GiantBomb ID
              </Label>
              <Input
                placeholder="e.g. 3030-54321"
                value={formData.giantbombId || ""}
                onChange={(e) => onChange("giantbombId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* VNDB ID */}
          {mediaType === "game" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                VNDB ID
              </Label>
              <Input
                placeholder="e.g. v1234"
                value={formData.vndbId || ""}
                onChange={(e) => onChange("vndbId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {/* Google Book ID */}
          {mediaType === "book" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Google Books ID
              </Label>
              <Input
                placeholder="e.g. zb01AAAAMAAJ"
                value={formData.googleBookId || ""}
                onChange={(e) => onChange("googleBookId", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
