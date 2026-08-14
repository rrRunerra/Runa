"use client";

import React, { ChangeEvent } from "react";
import { Compass, Check, RefreshCw, Sparkles, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface RrConstellationMetadataTabProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  redirect: string;
  setRedirect: (redirect: string) => void;
  icon: string;
  setIcon: (icon: string) => void;
  connectionColor: string;
  setConnectionColor: (color: string) => void;
  starColor: string;
  setStarColor: (color: string) => void;
  targetRa: number;
  setTargetRa: (ra: number) => void;
  targetDec: number;
  setTargetDec: (dec: number) => void;
  mode: "bookmark" | "device";
  isSaving: boolean;
  starsCount: number;
  editingBookmarkId: string | null;
  onOpenMapPicker: () => void;
  onSaveToBookmarks: () => void;
  onCancelEdit: () => void;
}

export function RrConstellationMetadataTab({
  name,
  setName,
  description,
  setDescription,
  redirect,
  setRedirect,
  icon,
  setIcon,
  connectionColor,
  setConnectionColor,
  starColor,
  setStarColor,
  targetRa,
  setTargetRa,
  targetDec,
  setTargetDec,
  mode,
  isSaving,
  starsCount,
  editingBookmarkId,
  onOpenMapPicker,
  onSaveToBookmarks,
  onCancelEdit,
}: RrConstellationMetadataTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {/* Constellation Identity Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <Sparkles className="size-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {t("constellationBuilder.constellationMeta")}
          </h3>
        </div>

        <FieldGroup>
          {/* Name Field */}
          <Field>
            <FieldLabel htmlFor="const-name" className="text-xs font-semibold text-foreground">
              {t("constellationBuilder.name")}
            </FieldLabel>
            <Input
              id="const-name"
              type="text"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 rounded-lg"
              placeholder="e.g. Orion, Vega..."
            />
          </Field>

          {mode !== "device" && (
            <>
              {/* Description Field */}
              <Field>
                <FieldLabel htmlFor="const-desc" className="text-xs font-semibold text-foreground">
                  {t("constellationBuilder.description")}
                </FieldLabel>
                <Input
                  id="const-desc"
                  type="text"
                  value={description}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 rounded-lg"
                  placeholder="Short description..."
                />
              </Field>

              {/* Redirect URL Field */}
              <Field>
                <FieldLabel htmlFor="const-redirect" className="text-xs font-semibold text-foreground">
                  {t("constellationBuilder.redirectPath")}
                </FieldLabel>
                <Input
                  id="const-redirect"
                  type="text"
                  value={redirect}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRedirect(e.target.value)}
                  className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 rounded-lg"
                  placeholder="/apps or https://..."
                />
              </Field>

              {/* Icon URL Field */}
              <Field>
                <FieldLabel htmlFor="const-icon" className="text-xs font-semibold text-foreground">
                  {t("constellationBuilder.iconUrl")}
                </FieldLabel>
                <Input
                  id="const-icon"
                  type="text"
                  placeholder="e.g. /favicons/my-app.ico"
                  value={icon}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setIcon(e.target.value)}
                  className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 rounded-lg"
                />
              </Field>
            </>
          )}

          {/* Color pickers */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field>
              <FieldLabel htmlFor="const-conn-color" className="text-xs font-semibold text-foreground">
                {t("constellationBuilder.lineColor")}
              </FieldLabel>
              <div className="flex gap-1.5 items-center">
                <Input
                  id="const-conn-color"
                  type="text"
                  placeholder="#6366f1"
                  value={connectionColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConnectionColor(e.target.value)}
                  className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 font-mono w-full rounded-lg"
                />
                <input
                  type="color"
                  value={connectionColor || "#6366f1"}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setConnectionColor(e.target.value)}
                  className="size-7 rounded-lg border border-input bg-transparent cursor-pointer shrink-0 p-0 overflow-hidden"
                  title="Choose connection line color"
                  aria-label="Choose line connection color visually"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="const-star-color" className="text-xs font-semibold text-foreground">
                {t("constellationBuilder.starColor")}
              </FieldLabel>
              <div className="flex gap-1.5 items-center">
                <Input
                  id="const-star-color"
                  type="text"
                  placeholder="#ffffff"
                  value={starColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStarColor(e.target.value)}
                  className="h-8 text-xs bg-background border-input focus-visible:ring-primary/20 font-mono w-full rounded-lg"
                />
                <input
                  type="color"
                  value={starColor || "#ffffff"}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStarColor(e.target.value)}
                  className="size-7 rounded-lg border border-input bg-transparent cursor-pointer shrink-0 p-0 overflow-hidden"
                  title="Choose star point color"
                  aria-label="Choose star point color visually"
                />
              </div>
            </Field>
          </div>
        </FieldGroup>
      </div>

      {/* Celestial Sky Target Position Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <MapPin className="size-3.5 text-primary" />
          <div>
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
              {t("constellationBuilder.universeTargetPos")}
            </Label>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("constellationBuilder.universeTargetPosDesc")}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="offset-ra" className="text-[10px] text-muted-foreground font-mono">
              {t("constellationBuilder.raOffset")}
            </Label>
            <Input
              id="offset-ra"
              type="number"
              step="0.01"
              value={targetRa}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTargetRa(parseFloat(e.target.value) || 0)
              }
              className="h-8 text-xs bg-background border-input font-mono rounded-lg"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="offset-dec" className="text-[10px] text-muted-foreground font-mono">
              {t("constellationBuilder.decOffset")}
            </Label>
            <Input
              id="offset-dec"
              type="number"
              step="0.01"
              value={targetDec}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTargetDec(parseFloat(e.target.value) || 0)
              }
              className="h-8 text-xs bg-background border-input font-mono rounded-lg"
            />
          </div>
        </div>

        <Button
          onClick={onOpenMapPicker}
          type="button"
          variant="outline"
          className="w-full mt-1.5 h-8 text-xs text-primary border-primary/25 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-1.5 rounded-lg cursor-pointer transition-all active:scale-98"
          aria-label="Pick target offset visually from the StarMap"
        >
          <Compass className="size-3.5" />
          {t("constellationBuilder.pickOffsetVisually")}
        </Button>

        {/* Primary Save Action */}
        <Button
          onClick={onSaveToBookmarks}
          type="button"
          disabled={starsCount === 0 || isSaving}
          className="w-full mt-1.5 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
          aria-label={
            isSaving
              ? "Saving constellation..."
              : mode === "device"
                ? "Save constellation for device"
                : editingBookmarkId
                  ? "Update existing bookmark"
                  : "Add current constellation to bookmarks"
          }
        >
          {isSaving ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              {t("constellationBuilder.saving")}
            </>
          ) : (
            <>
              <Check className="size-3.5" />
              {mode === "device"
                ? t("constellationBuilder.saveForDevice")
                : editingBookmarkId
                  ? t("constellationBuilder.updateBookmark")
                  : t("constellationBuilder.saveToBookmarks")}
            </>
          )}
        </Button>

        {editingBookmarkId && (
          <Button
            onClick={onCancelEdit}
            type="button"
            variant="ghost"
            className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Cancel editing this bookmark"
          >
            {t("constellationBuilder.cancelEdit")}
          </Button>
        )}
      </div>
    </div>
  );
}
