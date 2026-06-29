"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
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
  const getStatusOptions = (): { value: string; label: string }[] => {
    switch (mediaType) {
      case "anime":
        return [
          { value: "WATCHING", label: "Watching" },
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "manga":
        return [
          { value: "READING", label: "Reading" },
          { value: "PLANNING", label: "Plan to Read" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "tv":
        return [
          { value: "WATCHING", label: "Watching" },
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "movie":
        return [
          { value: "PLANNING", label: "Plan to Watch" },
          { value: "COMPLETED", label: "Completed" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "game":
        return [
          { value: "PLAYING", label: "Playing" },
          { value: "PLANNING", label: "Plan to Play" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      case "book":
        return [
          { value: "READING", label: "Reading" },
          { value: "PLANNING", label: "Plan to Read" },
          { value: "COMPLETED", label: "Completed" },
          { value: "ON_HOLD", label: "On Hold" },
          { value: "DROPPED", label: "Dropped" },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="grid grid-cols-6 gap-x-6 gap-y-4">
      {/* Status */}
      <div className="col-span-6 sm:col-span-2 flex flex-col gap-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Status
        </Label>
        <Select value={listStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full bg-background border border-border text-foreground h-10 px-3 text-xs font-medium hover:bg-muted/50 rounded-xl transition-all cursor-pointer">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border rounded-xl text-foreground">
            {getStatusOptions().map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Score */}
      <div className="col-span-6 sm:col-span-2 flex flex-col gap-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Score (0 - {scoreMax})
        </Label>
        <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all h-10">
          <Input
            type="number"
            min="0"
            max={scoreMax}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
            placeholder={`0-${scoreMax}`}
            className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-medium"
          />
        </div>
      </div>

      {/* Rewatches (Anime/Manga/TV/Movie/Book - Not Games) */}
      {mediaType !== "game" && (
        <div className="col-span-6 sm:col-span-2 flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            {mediaType === "manga" || mediaType === "book"
              ? "Total Rereads"
              : "Total Rewatches"}
          </Label>
          <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all h-10">
            <Input
              type="number"
              min="0"
              value={rewatches}
              onChange={(e) => {
                let val = e.target.value;
                if (Number(val) < 0) val = "0";
                onRewatchesChange(val);
              }}
              className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-10 w-full px-3 text-xs font-medium"
            />
          </div>
        </div>
      )}

      {/* Progress */}
      {mediaType !== "tv" && mediaType !== "movie" && (
        <div className="col-span-6 sm:col-span-2 flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            {mediaType === "anime"
              ? "Episode Progress"
              : mediaType === "game"
                ? "Hours Played"
                : "Chapter Progress"}
          </Label>
          <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all h-10">
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
              className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-medium"
            />
          </div>
        </div>
      )}

      {/* Volume Progress (Manga & Book) */}
      {(mediaType === "manga" || mediaType === "book") && (
        <div className="col-span-6 sm:col-span-2 flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Volume Progress
          </Label>
          <div className="flex bg-background border border-border rounded-xl overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all h-10">
            <Input
              type="number"
              min="0"
              max={volumesMax || undefined}
              value={volumes}
              onChange={(e) => onVolumesChange(e.target.value)}
              placeholder={`0 / ${volumesMax || "?"}`}
              className="border-0 bg-transparent text-foreground focus-visible:ring-0 h-full w-full px-3 text-xs font-medium"
            />
          </div>
        </div>
      )}

      {/* Start Date + Finish Date */}
      <div className="col-span-6 grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Start Date
          </Label>
          <Popover>
            <div className="relative w-full">
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-medium bg-background border border-border text-foreground h-10 hover:bg-muted/50 pr-8 rounded-xl transition-all text-xs cursor-pointer",
                    !startDate && "text-muted-foreground/40",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground/60" />
                  {startDate ? (
                    format(startDate, "yyyy-MM-dd")
                  ) : (
                    <span>Pick a date</span>
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
              className="w-auto p-0 bg-popover border border-border rounded-xl z-60"
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
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            Finish Date
          </Label>
          <Popover>
            <div className="relative w-full">
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-medium bg-background border border-border text-foreground h-10 hover:bg-muted/50 pr-8 rounded-xl transition-all text-xs cursor-pointer",
                    !finishDate && "text-muted-foreground/40",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground/60" />
                  {finishDate ? (
                    format(finishDate, "yyyy-MM-dd")
                  ) : (
                    <span>Pick a date</span>
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
              className="w-auto p-0 bg-popover border border-border rounded-xl z-60"
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

      {/* Notes */}
      <div className="col-span-6 flex flex-col gap-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Notes
        </Label>
        <Textarea
          placeholder="Your thoughts, reviews, or private notes..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="bg-background border border-border text-foreground min-h-[80px] resize-y h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all placeholder:text-muted-foreground/30 text-xs font-medium"
        />
      </div>
    </div>
  );
}
