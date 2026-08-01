"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  X,
  Star,
  RotateCcw,
  Hash,
  BookOpen,
  StickyNote,
  Activity,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RrMediaEditGeneralFieldsProps {
  mediaType: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  scoreMax: number;
  episodes?: number;
  chapters?: number;
  volumesMax?: number;
  listStatus: string;
  onStatusChange: (val: string) => void;
  score: string;
  onScoreChange: (val: string) => void;
  rewatches: string;
  onRewatchesChange: (val: string) => void;
  progress: string;
  onProgressChange: (val: string) => void;
  volumes: string;
  onVolumesChange: (val: string) => void;
  startDate: Date | undefined;
  onStartDateChange: (val: Date | undefined) => void;
  finishDate: Date | undefined;
  onFinishDateChange: (val: Date | undefined) => void;
  notes: string;
  onNotesChange: (val: string) => void;
}

export function RrMediaEditGeneralFields({
  mediaType,
  scoreMax,
  episodes,
  chapters,
  volumesMax,
  listStatus,
  onStatusChange,
  score,
  onScoreChange,
  rewatches,
  onRewatchesChange,
  progress,
  onProgressChange,
  volumes,
  onVolumesChange,
  startDate,
  onStartDateChange,
  finishDate,
  onFinishDateChange,
  notes,
  onNotesChange,
}: RrMediaEditGeneralFieldsProps): React.JSX.Element {
  const { t } = useTranslation();

  const getStatusOptions = (): {
    value: string;
    label: string;
    icon: React.ReactNode;
    colorClass: string;
  }[] => {
    const opts: Record<
      string,
      { label: string; icon: React.ReactNode; colorClass: string }
    > = {
      WATCHING: {
        label: t("aquila.watching"),
        icon: <PlayCircle className="size-3.5 text-primary" />,
        colorClass: "text-primary bg-primary/10 border-primary/20",
      },
      READING: {
        label: t("aquila.reading"),
        icon: <BookOpen className="size-3.5 text-primary" />,
        colorClass: "text-primary bg-primary/10 border-primary/20",
      },
      PLAYING: {
        label: t("aquila.playing"),
        icon: <PlayCircle className="size-3.5 text-primary" />,
        colorClass: "text-primary bg-primary/10 border-primary/20",
      },
      COMPLETED: {
        label: t("aquila.completed"),
        icon: <CheckCircle2 className="size-3.5 text-primary" />,
        colorClass: "text-primary bg-primary/10 border-primary/20",
      },
      ON_HOLD: {
        label: t("aquila.onHold"),
        icon: <PauseCircle className="size-3.5 text-muted-foreground" />,
        colorClass: "text-muted-foreground bg-muted border-border/60",
      },
      DROPPED: {
        label: t("aquila.dropped"),
        icon: <XCircle className="size-3.5 text-destructive" />,
        colorClass: "text-destructive bg-destructive/10 border-destructive/20",
      },
      PLANNING: {
        label: t("aquila.planning"),
        icon: <Clock className="size-3.5 text-muted-foreground" />,
        colorClass: "text-muted-foreground bg-muted/60 border-border/50",
      },
    };

    switch (mediaType) {
      case "anime":
      case "tv":
        return [
          { value: "WATCHING", ...opts.WATCHING },
          { value: "ON_HOLD", ...opts.ON_HOLD },
          { value: "COMPLETED", ...opts.COMPLETED },
          { value: "DROPPED", ...opts.DROPPED },
          { value: "PLANNING", ...opts.PLANNING },
        ];
      case "manga":
      case "book":
        return [
          { value: "READING", ...opts.READING },
          { value: "ON_HOLD", ...opts.ON_HOLD },
          { value: "COMPLETED", ...opts.COMPLETED },
          { value: "DROPPED", ...opts.DROPPED },
          { value: "PLANNING", ...opts.PLANNING },
        ];
      case "movie":
        return [
          { value: "COMPLETED", ...opts.COMPLETED },
          { value: "DROPPED", ...opts.DROPPED },
          { value: "PLANNING", ...opts.PLANNING },
        ];
      case "game":
        return [
          { value: "PLAYING", ...opts.PLAYING },
          { value: "ON_HOLD", ...opts.ON_HOLD },
          { value: "COMPLETED", ...opts.COMPLETED },
          { value: "DROPPED", ...opts.DROPPED },
          { value: "PLANNING", ...opts.PLANNING },
        ];
      default:
        return [];
    }
  };

  const statusOptions = getStatusOptions();
  const currentStatusOpt = statusOptions.find((opt) => opt.value === listStatus);

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Info Card Section */}
      <div className="bg-card/40 border border-border/60 backdrop-blur-xs rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          {/* Status */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
              <Activity className="size-3.5 text-primary" />
              {t("aquila.status")}
            </Label>
            <Select value={listStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full bg-background/80 border border-border/70 text-foreground h-10 px-3 text-xs font-medium hover:bg-muted/50 rounded-xl transition-all cursor-pointer shadow-2xs">
                <SelectValue placeholder={t("aquila.selectStatus")}>
                  {currentStatusOpt && (
                    <div className="flex items-center gap-2">
                      {currentStatusOpt.icon}
                      <span className="font-semibold">{currentStatusOpt.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/70 rounded-xl text-foreground p-1 shadow-xl">
                {statusOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="rounded-lg text-xs font-medium cursor-pointer my-0.5"
                  >
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score */}
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
              <Star className="size-3.5 text-primary" />
              {t("aquila.score")}
              <span className="text-[10px] text-muted-foreground/60 font-normal lowercase">
                (0 - {scoreMax})
              </span>
            </Label>
            <div className="flex bg-background/80 border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-10 shadow-2xs">
              <Input
                type="number"
                min="0"
                max={scoreMax}
                value={score}
                onChange={(e) => onScoreChange(e.target.value)}
                placeholder={`0 - ${scoreMax}`}
                className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-semibold placeholder:font-normal"
              />
            </div>
          </div>

          {/* Rewatches (Anime/Manga/TV/Movie/Book - Not Games) */}
          {mediaType !== "game" && (
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <RotateCcw className="size-3.5 text-primary" />
                {mediaType === "manga" || mediaType === "book"
                  ? t("aquila.totalRereads")
                  : t("aquila.totalRewatches")}
              </Label>
              <div className="flex bg-background/80 border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-10 shadow-2xs">
                <Input
                  type="number"
                  min="0"
                  value={rewatches}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (Number(val) < 0) val = "0";
                    onRewatchesChange(val);
                  }}
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full px-3 text-xs font-semibold"
                />
              </div>
            </div>
          )}

          {/* Progress */}
          {mediaType !== "tv" && mediaType !== "movie" && (
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <Hash className="size-3.5 text-primary" />
                {mediaType === "anime"
                  ? t("aquila.episodeProgress")
                  : mediaType === "game"
                    ? t("aquila.hoursPlayed")
                    : t("aquila.chapterProgress")}
              </Label>
              <div className="flex bg-background/80 border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-10 shadow-2xs">
                <Input
                  type="number"
                  min="0"
                  max={
                    mediaType === "anime"
                      ? episodes || undefined
                      : mediaType === "manga" || mediaType === "book"
                        ? chapters || undefined
                        : undefined
                  }
                  value={progress}
                  onChange={(e) => onProgressChange(e.target.value)}
                  placeholder={
                    mediaType === "anime"
                      ? `0 / ${episodes || "?"}`
                      : mediaType === "manga" || mediaType === "book"
                        ? `0 / ${chapters || "?"}`
                        : "0"
                  }
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-semibold placeholder:font-normal"
                />
              </div>
            </div>
          )}

          {/* Volume Progress (Manga & Book) */}
          {(mediaType === "manga" || mediaType === "book") && (
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                <BookOpen className="size-3.5 text-primary" />
                {t("aquila.volumeProgress")}
              </Label>
              <div className="flex bg-background/80 border border-border/70 rounded-xl overflow-hidden focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-10 shadow-2xs">
                <Input
                  type="number"
                  min="0"
                  max={volumesMax || undefined}
                  value={volumes}
                  onChange={(e) => onVolumesChange(e.target.value)}
                  placeholder={`0 / ${volumesMax || "?"}`}
                  className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-semibold placeholder:font-normal"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-3.5">
          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
              <CalendarIcon className="size-3.5 text-primary" />
              {t("aquila.startDate")}
            </Label>
            <Popover>
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium bg-background/80 border border-border/70 text-foreground h-10 hover:bg-muted/50 pr-8 rounded-xl transition-all text-xs cursor-pointer shadow-2xs",
                      !startDate && "text-muted-foreground/50",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-3.5 text-primary/70" />
                    {startDate ? (
                      format(startDate, "yyyy-MM-dd")
                    ) : (
                      <span>{t("aquila.pickDate")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                {startDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onStartDateChange(undefined);
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <PopoverContent
                align="start"
                className="w-auto p-0 bg-popover/95 backdrop-blur-md border border-border/70 rounded-2xl z-60 shadow-xl"
              >
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={onStartDateChange}
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Finish Date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
              <CalendarIcon className="size-3.5 text-primary" />
              {t("aquila.finishDate")}
            </Label>
            <Popover>
              <div className="relative w-full">
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-medium bg-background/80 border border-border/70 text-foreground h-10 hover:bg-muted/50 pr-8 rounded-xl transition-all text-xs cursor-pointer shadow-2xs",
                      !finishDate && "text-muted-foreground/50",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-3.5 text-primary/70" />
                    {finishDate ? (
                      format(finishDate, "yyyy-MM-dd")
                    ) : (
                      <span>{t("aquila.pickDate")}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                {finishDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onFinishDateChange(undefined);
                    }}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
              <PopoverContent
                align="start"
                className="w-auto p-0 bg-popover/95 backdrop-blur-md border border-border/70 rounded-2xl z-60 shadow-xl"
              >
                <Calendar
                  mode="single"
                  selected={finishDate}
                  onSelect={onFinishDateChange}
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Notes Section Card */}
      <div className="bg-card/40 border border-border/60 backdrop-blur-xs rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shadow-xs">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
          <StickyNote className="size-3.5 text-primary" />
          {t("aquila.notes")}
        </Label>
        <Textarea
          placeholder={t("aquila.notesPlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="bg-background/80 border border-border/70 text-foreground min-h-24 resize-y rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/60 transition-all placeholder:text-muted-foreground/40 text-xs font-medium leading-relaxed p-3 shadow-2xs"
        />
      </div>
    </div>
  );
}

