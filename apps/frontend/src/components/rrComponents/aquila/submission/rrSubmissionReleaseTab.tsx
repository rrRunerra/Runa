"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, DollarSign, BookOpen, Tv, Gamepad2 } from "lucide-react";

export interface RrSubmissionReleaseTabProps {
  mediaType: string;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export function RrSubmissionReleaseTab({
  mediaType,
  formData,
  onChange,
}: RrSubmissionReleaseTabProps): React.JSX.Element {
  return (
    <div className="space-y-5 m-0">
      {/* 1. Dates Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Calendar className="size-4 text-primary" />
          Release & Air Dates
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start / First Air Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              {mediaType === "tv"
                ? "First Aired Date"
                : mediaType === "movie" || mediaType === "game" || mediaType === "book"
                  ? "Release / Publication Date"
                  : "Start Date"}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="YYYY"
                value={
                  formData.startDateYear ||
                  formData.firstAiredYear ||
                  formData.releaseDateYear ||
                  ""
                }
                onChange={(e) => {
                  onChange("startDateYear", e.target.value);
                  onChange("firstAiredYear", e.target.value);
                  onChange("releaseDateYear", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Input
                type="number"
                placeholder="MM (1-12)"
                value={
                  formData.startDateMonth ||
                  formData.firstAiredMonth ||
                  formData.releaseDateMonth ||
                  ""
                }
                onChange={(e) => {
                  onChange("startDateMonth", e.target.value);
                  onChange("firstAiredMonth", e.target.value);
                  onChange("releaseDateMonth", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
              <Input
                type="number"
                placeholder="DD (1-31)"
                value={
                  formData.startDateDay ||
                  formData.firstAiredDay ||
                  formData.releaseDateDay ||
                  ""
                }
                onChange={(e) => {
                  onChange("startDateDay", e.target.value);
                  onChange("firstAiredDay", e.target.value);
                  onChange("releaseDateDay", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>

          {/* End / Last Air Date */}
          {(mediaType === "anime" || mediaType === "manga" || mediaType === "tv") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {mediaType === "tv" ? "Last Aired Date" : "End Date"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="YYYY"
                  value={formData.endDateYear || formData.lastAiredYear || ""}
                  onChange={(e) => {
                    onChange("endDateYear", e.target.value);
                    onChange("lastAiredYear", e.target.value);
                  }}
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                />
                <Input
                  type="number"
                  placeholder="MM (1-12)"
                  value={formData.endDateMonth || formData.lastAiredMonth || ""}
                  onChange={(e) => {
                    onChange("endDateMonth", e.target.value);
                    onChange("lastAiredMonth", e.target.value);
                  }}
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                />
                <Input
                  type="number"
                  placeholder="DD (1-31)"
                  value={formData.endDateDay || formData.lastAiredDay || ""}
                  onChange={(e) => {
                    onChange("endDateDay", e.target.value);
                    onChange("lastAiredDay", e.target.value);
                  }}
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Season & Year (Anime) */}
        {mediaType === "anime" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Season Period
              </Label>
              <Select
                value={formData.season || formData.seasonSeason || "SPRING"}
                onValueChange={(v) => {
                  onChange("season", v);
                  onChange("seasonSeason", v);
                }}
              >
                <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                  <SelectItem value="WINTER">Winter</SelectItem>
                  <SelectItem value="SPRING">Spring</SelectItem>
                  <SelectItem value="SUMMER">Summer</SelectItem>
                  <SelectItem value="FALL">Fall</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Season Year
              </Label>
              <Input
                type="number"
                placeholder="e.g. 2026"
                value={formData.seasonYear || ""}
                onChange={(e) => onChange("seasonYear", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Counts & Durations */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Clock className="size-4 text-primary" />
          Counts, Length & Runtime
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(mediaType === "anime" || mediaType === "tv") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Episode Count
              </Label>
              <Input
                type="number"
                placeholder="e.g. 24"
                value={formData.episodes || formData.episodeCount || ""}
                onChange={(e) => {
                  onChange("episodes", e.target.value);
                  onChange("episodeCount", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {mediaType === "tv" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Season Count
              </Label>
              <Input
                type="number"
                placeholder="e.g. 5"
                value={formData.seasonCount || ""}
                onChange={(e) => onChange("seasonCount", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {(mediaType === "manga" || mediaType === "book") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Chapter Count
              </Label>
              <Input
                type="number"
                placeholder="e.g. 130"
                value={formData.chapters || formData.chapterCount || ""}
                onChange={(e) => {
                  onChange("chapters", e.target.value);
                  onChange("chapterCount", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {(mediaType === "manga" || mediaType === "book") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Volume Count
              </Label>
              <Input
                type="number"
                placeholder="e.g. 12"
                value={formData.volumes || formData.volumeCount || ""}
                onChange={(e) => {
                  onChange("volumes", e.target.value);
                  onChange("volumeCount", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {mediaType === "book" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Page Count
              </Label>
              <Input
                type="number"
                placeholder="e.g. 350"
                value={formData.pageCount || ""}
                onChange={(e) => onChange("pageCount", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}

          {(mediaType === "anime" || mediaType === "tv" || mediaType === "movie") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Runtime (minutes)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 24 or 120"
                value={
                  formData.duration ||
                  formData.runtime ||
                  formData.averageRuntime ||
                  ""
                }
                onChange={(e) => {
                  onChange("duration", e.target.value);
                  onChange("runtime", e.target.value);
                  onChange("averageRuntime", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Media-Specific Details */}
      {/* Movie Budget & Revenue */}
      {mediaType === "movie" && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <DollarSign className="size-4 text-primary" />
            Financials (USD)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Production Budget
              </Label>
              <Input
                type="number"
                placeholder="e.g. 100000000"
                value={formData.budget ? String(formData.budget) : ""}
                onChange={(e) => onChange("budget", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Box Office Revenue
              </Label>
              <Input
                type="number"
                placeholder="e.g. 500000000"
                value={
                  formData.revenue || formData.boxOffice
                    ? String(formData.revenue || formData.boxOffice)
                    : ""
                }
                onChange={(e) => {
                  onChange("revenue", e.target.value);
                  onChange("boxOffice", e.target.value);
                }}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* TV Broadcast */}
      {mediaType === "tv" && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Tv className="size-4 text-primary" />
            Broadcast & Show Specs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Broadcast Time
              </Label>
              <Input
                placeholder="e.g. 22:00 JST"
                value={formData.broadcastTime || ""}
                onChange={(e) => onChange("broadcastTime", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Show Type
              </Label>
              <Input
                placeholder="e.g. Scripted, Reality, Animation"
                value={formData.showType || ""}
                onChange={(e) => onChange("showType", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Game HowLongToBeat */}
      {mediaType === "game" && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Gamepad2 className="size-4 text-primary" />
            HowLongToBeat Estimates (Hours)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Main Story
              </Label>
              <Input
                type="number"
                placeholder="e.g. 35"
                value={formData.hltbMainStory || ""}
                onChange={(e) => onChange("hltbMainStory", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Main + Extras
              </Label>
              <Input
                type="number"
                placeholder="e.g. 60"
                value={formData.hltbExtraStory || ""}
                onChange={(e) => onChange("hltbExtraStory", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Completionist
              </Label>
              <Input
                type="number"
                placeholder="e.g. 100"
                value={formData.hltbCompletionist || ""}
                onChange={(e) => onChange("hltbCompletionist", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Manga Specs */}
      {mediaType === "manga" && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <BookOpen className="size-4 text-primary" />
            Serialization & Publishing Specs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Serialization Magazine
              </Label>
              <Input
                placeholder="e.g. Weekly Shonen Jump"
                value={formData.serialization || ""}
                onChange={(e) => onChange("serialization", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Imprint Label
              </Label>
              <Input
                placeholder="e.g. Dengeki Bunko, Yen On"
                value={formData.imprint || ""}
                onChange={(e) => onChange("imprint", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Reading Direction
              </Label>
              <Select
                value={formData.readingDirection || "RIGHT_TO_LEFT"}
                onValueChange={(v) => onChange("readingDirection", v)}
              >
                <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                  <SelectItem value="RIGHT_TO_LEFT">Right to Left</SelectItem>
                  <SelectItem value="LEFT_TO_RIGHT">Left to Right</SelectItem>
                  <SelectItem value="TOP_TO_BOTTOM">Top to Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Book Series & Pricing */}
      {mediaType === "book" && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <BookOpen className="size-4 text-primary" />
            Book Series, Identifiers & Pricing
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Book Series Name
              </Label>
              <Input
                placeholder="e.g. Harry Potter"
                value={formData.series || ""}
                onChange={(e) => onChange("series", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Series Entry #
              </Label>
              <Input
                type="number"
                placeholder="e.g. 1"
                value={formData.seriesPosition || ""}
                onChange={(e) => onChange("seriesPosition", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Retail Price & Currency
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Price"
                  value={formData.retailPrice || ""}
                  onChange={(e) => onChange("retailPrice", e.target.value)}
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium flex-1"
                />
                <Input
                  placeholder="USD"
                  value={formData.retailPriceCurrency || "USD"}
                  onChange={(e) =>
                    onChange("retailPriceCurrency", e.target.value)
                  }
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium w-20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                ISBN-10
              </Label>
              <Input
                placeholder="e.g. 0747532699"
                value={formData.isbn10 || ""}
                onChange={(e) => onChange("isbn10", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                ISBN-13
              </Label>
              <Input
                placeholder="e.g. 9780747532699"
                value={formData.isbn13 || ""}
                onChange={(e) => onChange("isbn13", e.target.value)}
                className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
