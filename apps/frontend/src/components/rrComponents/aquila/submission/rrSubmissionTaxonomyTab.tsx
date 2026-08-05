"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Tag, ShieldAlert, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RrSubmissionTaxonomyTabProps {
  mediaType: string;
  genreOptions: string[];
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  synonymsList: string[];
  onAddSynonym: (synonym: string) => void;
  onRemoveSynonym: (synonym: string) => void;
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const AGE_RATING_OPTIONS: Record<string, string[]> = {
  anime: ["G - All Ages", "PG - Children", "PG-13 - Teens 13+", "R-17+ - Violence & Nudity", "R-18+ - Hentai / Adult", "Unrated"],
  manga: ["G - All Ages", "PG - Children", "PG-13 - Teens 13+", "R-17+ - Violence & Nudity", "R-18+ - Hentai / Adult", "Unrated"],
  tv: ["TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA", "Unrated"],
  movie: ["G", "PG", "PG-13", "R", "NC-17", "Unrated"],
  game: ["EVERYONE", "EVERYONE 10+", "TEEN", "MATURE 17+", "ADULT ONLY 18+", "PEGI 3", "PEGI 7", "PEGI 12", "PEGI 16", "PEGI 18", "Unrated"],
  book: ["All Ages", "Middle Grade", "Young Adult (YA)", "Adult", "Explicit / 18+", "Unrated"],
};

const PRESET_CONTENT_WARNINGS = [
  "Violence",
  "Fantasy Violence",
  "Blood & Gore",
  "Strong Language / Profanity",
  "Nudity",
  "Sexual Content / Themes",
  "Substance Use / Alcohol",
  "Gambling",
  "Crude Humor",
  "Frightening Scenes / Horror",
  "Suicide / Self-Harm",
];

export function RrSubmissionTaxonomyTab({
  mediaType,
  genreOptions,
  selectedGenres,
  onToggleGenre,
  synonymsList,
  onAddSynonym,
  onRemoveSynonym,
  formData,
  onChange,
}: RrSubmissionTaxonomyTabProps): React.JSX.Element {
  const [newSynonym, setNewSynonym] = useState("");
  const [newTag, setNewTag] = useState("");
  const [customWarning, setCustomWarning] = useState("");

  const tagsList: string[] = Array.isArray(formData.tags) ? formData.tags : [];

  // Parse current content warnings from ageRatingGuide string or array
  const currentWarnings: string[] = typeof formData.ageRatingGuide === "string"
    ? formData.ageRatingGuide.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(formData.ageRatingGuide)
    ? formData.ageRatingGuide
    : [];

  const handleToggleWarning = (warning: string) => {
    let next: string[];
    if (currentWarnings.includes(warning)) {
      next = currentWarnings.filter((w) => w !== warning);
    } else {
      next = [...currentWarnings, warning];
    }
    onChange("ageRatingGuide", next.join(", "));
  };

  const handleAddCustomWarning = () => {
    const trimmed = customWarning.trim();
    if (trimmed && !currentWarnings.includes(trimmed)) {
      const next = [...currentWarnings, trimmed];
      onChange("ageRatingGuide", next.join(", "));
      setCustomWarning("");
    }
  };

  const handleRemoveWarning = (warning: string) => {
    const next = currentWarnings.filter((w) => w !== warning);
    onChange("ageRatingGuide", next.join(", "));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tagsList.includes(newTag.trim())) {
      onChange("tags", [...tagsList, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange(
      "tags",
      tagsList.filter((t) => t !== tag),
    );
  };

  const handleSynonymAddAction = () => {
    if (newSynonym.trim()) {
      onAddSynonym(newSynonym.trim());
      setNewSynonym("");
    }
  };

  const ageOptions = AGE_RATING_OPTIONS[mediaType.toLowerCase()] || AGE_RATING_OPTIONS.anime;

  return (
    <div className="space-y-5 m-0">
      {/* Genres */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Tag className="size-4 text-primary" />
          Genres
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {genreOptions.map((genre) => {
            const isSelected = selectedGenres.includes(genre);
            return (
              <Badge
                key={genre}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "cursor-pointer text-xs font-bold px-3 py-1 rounded-full transition-all hover:scale-105 shadow-2xs",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                    : "bg-background/80 border-border/70 text-foreground hover:bg-muted",
                )}
                onClick={() => onToggleGenre(genre)}
              >
                {genre}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Rich Tags */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Tag className="size-4 text-primary" />
          Rich Media Tags
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add tag (e.g. Dark Comedy, Time Travel, Magic)..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), handleAddTag())
            }
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAddTag}
            className="h-10 px-4 rounded-xl font-bold"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {tagsList.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="gap-1.5 text-xs font-semibold py-1 px-3 rounded-xl bg-background border border-border/70"
            >
              {t}
              <Trash2
                className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => handleRemoveTag(t)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Synonyms */}
      <div className="space-y-3 bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Tag className="size-4 text-primary" />
          Alternative Titles / Synonyms
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add alternative title / synonym..."
            value={newSynonym}
            onChange={(e) => setNewSynonym(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              (e.preventDefault(), handleSynonymAddAction())
            }
            className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSynonymAddAction}
            className="h-10 px-4 rounded-xl font-bold"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {synonymsList.map((syn) => (
            <Badge
              key={syn}
              variant="secondary"
              className="gap-1.5 text-xs font-semibold py-1 px-3 rounded-xl bg-background border border-border/70"
            >
              {syn}
              <Trash2
                className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => onRemoveSynonym(syn)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Publishing / Game Specs */}
      {(mediaType === "game" || mediaType === "book" || mediaType === "manga") && (
        <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Tag className="size-4 text-primary" />
            Publishing, Developers & Platforms
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(mediaType === "book" || mediaType === "manga" || mediaType === "game") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Publishers (comma separated)
                </Label>
                <Input
                  placeholder="e.g. Shueisha, VIZ Media, Bandai Namco"
                  value={
                    Array.isArray(formData.publishers)
                      ? formData.publishers.join(", ")
                      : formData.publishers || ""
                  }
                  onChange={(e) =>
                    onChange(
                      "publishers",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                />
              </div>
            )}

            {mediaType === "book" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Authors (comma separated)
                </Label>
                <Input
                  placeholder="e.g. J.K. Rowling, George R.R. Martin"
                  value={
                    Array.isArray(formData.authors)
                      ? formData.authors.join(", ")
                      : formData.authors || ""
                  }
                  onChange={(e) =>
                    onChange(
                      "authors",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                />
              </div>
            )}

            {mediaType === "game" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Developers (comma separated)
                  </Label>
                  <Input
                    placeholder="e.g. FromSoftware, CD Projekt Red"
                    value={
                      Array.isArray(formData.developers)
                        ? formData.developers.join(", ")
                        : formData.developers || ""
                    }
                    onChange={(e) =>
                      onChange(
                        "developers",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Platforms (comma separated)
                  </Label>
                  <Input
                    placeholder="e.g. PC, PS5, Xbox Series X, Nintendo Switch"
                    value={
                      Array.isArray(formData.platforms)
                        ? formData.platforms.join(", ")
                        : formData.platforms || ""
                    }
                    onChange={(e) =>
                      onChange(
                        "platforms",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Age Rating & Multi-Select Content Warnings Section */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <ShieldAlert className="size-4 text-primary" />
          Content Rating & Maturity Warnings
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Age Rating Dropdown */}
          <div className="space-y-1.5 sm:col-span-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Age Rating Label *
            </Label>
            <Select
              value={formData.ageRating || formData.esrbRating || ageOptions[0]}
              onValueChange={(val) => {
                onChange("ageRating", val);
                onChange("esrbRating", val);
              }}
            >
              <SelectTrigger className="h-10 text-xs font-medium bg-background/80 border-border/70 rounded-xl shadow-2xs">
                <SelectValue placeholder="Select Age Rating" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/70 rounded-xl">
                {ageOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Age Rating Fallback Input */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              Custom / Specific Rating Code
            </Label>
            <Input
              placeholder="e.g. PG-13, TV-MA, PEGI 18, ESRB M..."
              value={formData.ageRating || formData.esrbRating || ""}
              onChange={(e) => {
                onChange("ageRating", e.target.value);
                onChange("esrbRating", e.target.value);
              }}
              className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
          </div>
        </div>

        {/* Multi-Select Content Warnings Dropdown & Custom Write-in */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <Label className="text-xs font-semibold text-muted-foreground">
            Content Warnings & Rating Guide (Multi-Select & Custom Write-In)
          </Label>

          {/* Preset Warnings Quick-Toggle Chips */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_CONTENT_WARNINGS.map((warn) => {
              const isChecked = currentWarnings.includes(warn);
              return (
                <Badge
                  key={warn}
                  variant={isChecked ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-[11px] font-semibold py-1 px-2.5 rounded-lg transition-all gap-1",
                    isChecked
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background/80 border-border/70 text-foreground hover:bg-muted",
                  )}
                  onClick={() => handleToggleWarning(warn)}
                >
                  {isChecked && <Check className="size-3" />}
                  {warn}
                </Badge>
              );
            })}
          </div>

          {/* Custom Warning Write-In Input */}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Type custom content warning (e.g. Flashing Lights, Claustrophobia)..."
              value={customWarning}
              onChange={(e) => setCustomWarning(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddCustomWarning())
              }
              className="bg-background/80 border-border/70 rounded-xl h-10 text-xs font-medium"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleAddCustomWarning}
              className="h-10 px-4 rounded-xl font-bold shrink-0"
            >
              <Plus className="size-4 mr-1" /> Add Custom
            </Button>
          </div>

          {/* Selected Warnings Displayed as Removable Badges */}
          {currentWarnings.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {currentWarnings.map((w) => (
                <Badge
                  key={w}
                  variant="secondary"
                  className="gap-1.5 text-xs font-semibold py-1 px-3 rounded-xl bg-background border border-border/70 text-foreground"
                >
                  {w}
                  <Trash2
                    className="size-3.5 cursor-pointer text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => handleRemoveWarning(w)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
