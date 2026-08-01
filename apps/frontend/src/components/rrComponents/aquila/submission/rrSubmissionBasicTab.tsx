"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Link as LinkIcon, Hash } from "lucide-react";

export interface RrSubmissionBasicTabProps {
  mediaType: string;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  formatOptions: string[];
  statusOptions: string[];
  sourceOptions: string[];
}

export function RrSubmissionBasicTab({
  mediaType,
  formData,
  onChange,
  formatOptions,
  statusOptions,
  sourceOptions,
}: RrSubmissionBasicTabProps): React.JSX.Element {
  return (
    <div className="space-y-4 m-0">
      {/* Titles Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Title (English / Primary) *
          </Label>
          <Input
            placeholder="e.g. Frieren: Beyond Journey's End"
            value={formData.titleEnglish || formData.titlePrimary || ""}
            onChange={(e) => {
              onChange("titleEnglish", e.target.value);
              onChange("titlePrimary", e.target.value);
            }}
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Title (Romaji / Secondary)
          </Label>
          <Input
            placeholder="e.g. Sousou no Frieren"
            value={formData.titleRomaji || formData.titleSecondary || ""}
            onChange={(e) => {
              onChange("titleRomaji", e.target.value);
              onChange("titleSecondary", e.target.value);
            }}
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-1.5 md:col-span-1">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Title (Native)
          </Label>
          <Input
            placeholder="e.g. 葬送のフリーレン"
            value={formData.titleNative || ""}
            onChange={(e) => onChange("titleNative", e.target.value)}
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* Tagline */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Tagline
        </Label>
        <Input
          placeholder="e.g. The adventure is over, but life goes on..."
          value={formData.tagline || ""}
          onChange={(e) => onChange("tagline", e.target.value)}
          className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Synopsis / Description
        </Label>
        <Textarea
          rows={4}
          placeholder="Enter detailed plot synopsis or description..."
          value={formData.description || ""}
          onChange={(e) => onChange("description", e.target.value)}
          className="bg-background/80 border-border/70 rounded-xl text-xs font-medium p-3 focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
        />
      </div>

      {/* Format, Status, Source Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
        {formatOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Format
            </Label>
            <Select
              value={formData.format || formatOptions[0] || ""}
              onValueChange={(v) => onChange("format", v)}
            >
              <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                {formatOptions.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {statusOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={formData.status || statusOptions[0] || ""}
              onValueChange={(v) => onChange("status", v)}
            >
              <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                {statusOptions.map((st) => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {sourceOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Source
            </Label>
            <Select
              value={formData.source || sourceOptions[0] || "ORIGINAL"}
              onValueChange={(v) => onChange("source", v)}
            >
              <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 border-border/70 rounded-xl">
                {sourceOptions.map((src) => (
                  <SelectItem key={src} value={src}>
                    {src}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Country, Language, Hashtag */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Country of Origin
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="e.g. JP, US, KR, CN"
              value={formData.countryOfOrigin || ""}
              onChange={(e) => onChange("countryOfOrigin", e.target.value)}
              className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Original Language
          </Label>
          <Input
            placeholder="e.g. ja, en, ko, zh"
            value={formData.originalLanguage || ""}
            onChange={(e) => onChange("originalLanguage", e.target.value)}
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Hashtag
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="e.g. #frieren"
              value={formData.hashtag || ""}
              onChange={(e) => onChange("hashtag", e.target.value)}
              className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Web & Official Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Official Website / Homepage
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="https://frieren-anime.jp"
              value={formData.website || formData.homepage || ""}
              onChange={(e) => {
                onChange("website", e.target.value);
                onChange("homepage", e.target.value);
              }}
              className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Primary Database Site URL
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="https://anilist.co/anime/154587"
              value={formData.siteUrl || ""}
              onChange={(e) => onChange("siteUrl", e.target.value)}
              className="pl-9 bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
