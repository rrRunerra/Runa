"use client";

import React, { useMemo } from "react";
import {
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  Layers,
  Activity,
  Globe,
  Sparkles,
  X,
  Sun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RankingSourceOption } from "@/types/aquila";
import { cn } from "@/lib/utils";

interface RrRankingsFilterBarProps {
  sources: RankingSourceOption[];
  genres: string[];
  years: number[];
  seasons: string[];
  formats: string[];
  statuses: string[];
  selectedSource: string;
  selectedGenre: string;
  selectedYear: string;
  selectedSeason: string;
  selectedFormat: string;
  selectedStatus: string;
  onSourceChange: (source: string) => void;
  onGenreChange: (genre: string) => void;
  onYearChange: (year: string) => void;
  onSeasonChange: (season: string) => void;
  onFormatChange: (format: string) => void;
  onStatusChange: (status: string) => void;
  onResetFilters: () => void;
  onClose?: () => void;
}

export const RrRankingsFilterBar: React.FC<RrRankingsFilterBarProps> = ({
  sources,
  genres,
  years,
  seasons,
  formats,
  statuses,
  selectedSource,
  selectedGenre,
  selectedYear,
  selectedSeason,
  selectedFormat,
  selectedStatus,
  onSourceChange,
  onGenreChange,
  onYearChange,
  onSeasonChange,
  onFormatChange,
  onStatusChange,
  onResetFilters,
  onClose,
}) => {
  const { t } = useTranslation();

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSource !== "aquila" && selectedSource !== "all") count++;
    if (selectedGenre !== "all" && selectedGenre.trim() !== "") count++;
    if (selectedYear !== "all" && selectedYear.trim() !== "") count++;
    if (selectedSeason !== "all" && selectedSeason.trim() !== "") count++;
    if (selectedFormat !== "all" && selectedFormat.trim() !== "") count++;
    if (selectedStatus !== "all" && selectedStatus.trim() !== "") count++;
    return count;
  }, [
    selectedSource,
    selectedGenre,
    selectedYear,
    selectedSeason,
    selectedFormat,
    selectedStatus,
  ]);

  return (
    <div className="flex flex-col gap-3.5 w-full bg-card/60 border border-border/60 rounded-2xl p-4 backdrop-blur-md shadow-md">
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
          <SlidersHorizontal className="size-4 text-primary" />
          <span>Filters & Parameters</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-bold rounded-full bg-primary/15 text-primary border-primary/30"
            >
              {activeFiltersCount} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1 rounded-lg cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>{t("aquila.rankings.resetFilters")}</span>
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Close Filters"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Primary Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Source Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
            <Globe className="size-3 text-primary" />
            <span>{t("aquila.rankings.source")}</span>
          </label>
          <Select value={selectedSource} onValueChange={onSourceChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
              <SelectValue placeholder={t("aquila.rankings.source")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {sources.map((src) => (
                <SelectItem key={src.id} value={src.id} className="text-xs">
                  {src.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Genre Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
            <Sparkles className="size-3 text-primary" />
            <span>{t("aquila.rankings.allGenres")}</span>
          </label>
          <Select value={selectedGenre} onValueChange={onGenreChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
              <SelectValue placeholder={t("aquila.rankings.allGenres")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">
                {t("aquila.rankings.allGenres")}
              </SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre} className="text-xs">
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
            <Calendar className="size-3 text-primary" />
            <span>{t("aquila.rankings.allYears")}</span>
          </label>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
              <SelectValue placeholder={t("aquila.rankings.allYears")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">
                {t("aquila.rankings.allYears")}
              </SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Season Selector (if available) */}
        {seasons.length > 0 ? (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
              <Sun className="size-3 text-primary" />
              <span>{t("aquila.rankings.allSeasons")}</span>
            </label>
            <Select value={selectedSeason} onValueChange={onSeasonChange}>
              <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
                <SelectValue placeholder={t("aquila.rankings.allSeasons")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all" className="text-xs font-semibold">
                  {t("aquila.rankings.allSeasons")}
                </SelectItem>
                {seasons.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex flex-col gap-1 opacity-40 pointer-events-none">
            <label className="text-[11px] font-medium text-muted-foreground pl-1">
              {t("aquila.rankings.allSeasons")}
            </label>
            <div className="h-9 rounded-xl text-xs bg-background/40 border border-border/40 flex items-center px-3 text-muted-foreground">
              —
            </div>
          </div>
        )}

        {/* Format Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
            <Layers className="size-3 text-primary" />
            <span>{t("aquila.rankings.allFormats")}</span>
          </label>
          <Select value={selectedFormat} onValueChange={onFormatChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
              <SelectValue placeholder={t("aquila.rankings.allFormats")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">
                {t("aquila.rankings.allFormats")}
              </SelectItem>
              {formats.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">
                  {f.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 pl-1">
            <Activity className="size-3 text-primary" />
            <span>{t("aquila.rankings.allStatuses")}</span>
          </label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 rounded-xl text-xs bg-background/80 border-border/60">
              <SelectValue placeholder={t("aquila.rankings.allStatuses")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">
                {t("aquila.rankings.allStatuses")}
              </SelectItem>
              {statuses.map((st) => (
                <SelectItem key={st} value={st} className="text-xs">
                  {st.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="size-3 text-primary" />
            <span>Active:</span>
          </span>

          {selectedSource !== "aquila" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onSourceChange("aquila")}
            >
              <span>
                {sources.find((s) => s.id === selectedSource)?.name ||
                  selectedSource}
              </span>
              <X className="size-3" />
            </Badge>
          )}

          {selectedGenre !== "all" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onGenreChange("all")}
            >
              <span>{selectedGenre}</span>
              <X className="size-3" />
            </Badge>
          )}

          {selectedYear !== "all" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onYearChange("all")}
            >
              <span>{selectedYear}</span>
              <X className="size-3" />
            </Badge>
          )}

          {selectedSeason !== "all" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onSeasonChange("all")}
            >
              <span>{selectedSeason}</span>
              <X className="size-3" />
            </Badge>
          )}

          {selectedFormat !== "all" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onFormatChange("all")}
            >
              <span>{selectedFormat.replace(/_/g, " ")}</span>
              <X className="size-3" />
            </Badge>
          )}

          {selectedStatus !== "all" && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 px-2 text-[11px] rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer"
              onClick={() => onStatusChange("all")}
            >
              <span>{selectedStatus.replace(/_/g, " ")}</span>
              <X className="size-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
