"use client";

import React, { ChangeEvent } from "react";
import {
  Upload,
  Lock,
  Unlock,
  Trash2,
  Sun,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  RotateCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface RrConstellationReferenceControlsProps {
  bgImage: string | null;
  bgLocked: boolean;
  bgOpacity: number;
  bgScale: number;
  bgX: number;
  bgY: number;
  bgRotation: number;
  onImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onToggleLock: () => void;
  onOpacityChange: (val: number) => void;
  onScaleChange: (val: number) => void;
  onXChange: (val: number) => void;
  onYChange: (val: number) => void;
  onRotationChange: (val: number) => void;
  onNudge: (direction: "up" | "down" | "left" | "right") => void;
  onResetPosition: () => void;
}

export function RrConstellationReferenceControls({
  bgImage,
  bgLocked,
  bgOpacity,
  bgScale,
  bgX,
  bgY,
  bgRotation,
  onImageUpload,
  onRemoveImage,
  onToggleLock,
  onOpacityChange,
  onScaleChange,
  onXChange,
  onYChange,
  onRotationChange,
  onNudge,
  onResetPosition,
}: RrConstellationReferenceControlsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="bg-card/70 border border-border/80 p-3.5 rounded-xl flex flex-col gap-3 shrink-0 backdrop-blur-xs transition-all">
      {/* Header bar: Upload & Lock / Clear Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={onImageUpload}
            className="hidden"
            id="modal-image-upload"
            aria-label={t("constellationBuilder.overlayImage")}
          />
          <label
            htmlFor="modal-image-upload"
            className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg border border-input bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors shadow-xs active:scale-95"
          >
            <Upload className="size-3.5 text-primary" />
            {bgImage
              ? t("constellationBuilder.overlayImage")
              : t("constellationBuilder.chooseFile")}
          </label>

          {bgImage && (
            <span className="text-[11px] text-emerald-500 font-mono flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t("constellationBuilder.imageLoaded")}
            </span>
          )}
        </div>

        {bgImage && (
          <div className="flex items-center gap-1.5">
            {/* Position Lock Button */}
            <Button
              type="button"
              variant={bgLocked ? "outline" : "default"}
              size="sm"
              onClick={onToggleLock}
              className={cn(
                "h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5",
                !bgLocked
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-label={
                bgLocked
                  ? t("constellationBuilder.unlockDrag")
                  : t("constellationBuilder.lockPosition")
              }
            >
              {bgLocked ? (
                <>
                  <Lock className="size-3.5" />
                  {t("constellationBuilder.unlockDrag")}
                </>
              ) : (
                <>
                  <Unlock className="size-3.5" />
                  {t("constellationBuilder.lockPosition")}
                </>
              )}
            </Button>

            {/* Remove Image Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveImage}
              className="h-8 px-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all"
              title="Remove reference image"
              aria-label="Remove reference image"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Sliders and Nudge controls when image is loaded */}
      {bgImage && (
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Sliders Grid */}
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Opacity */}
            <div className="flex flex-col gap-1 bg-muted/20 p-2 rounded-lg border border-border/40">
              <Label className="text-[10px] text-muted-foreground flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <Sun className="size-3 text-primary/70" />
                  {t("constellationBuilder.opacity")}
                </span>
                <span className="font-semibold text-foreground">
                  {Math.round(bgOpacity * 100)}%
                </span>
              </Label>
              <Slider
                min={0.05}
                max={1}
                step={0.05}
                value={[bgOpacity]}
                onValueChange={(val: number[]) => onOpacityChange(val[0])}
                className="my-1"
                aria-label={t("constellationBuilder.opacity")}
              />
            </div>

            {/* Scale */}
            <div className="flex flex-col gap-1 bg-muted/20 p-2 rounded-lg border border-border/40">
              <Label className="text-[10px] text-muted-foreground flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <Maximize2 className="size-3 text-primary/70" />
                  {t("constellationBuilder.scale")}
                </span>
                <span className="font-semibold text-foreground">
                  {bgScale.toFixed(2)}x
                </span>
              </Label>
              <Slider
                min={0.1}
                max={4}
                step={0.05}
                value={[bgScale]}
                onValueChange={(val: number[]) => onScaleChange(val[0])}
                className="my-1"
                aria-label={t("constellationBuilder.scale")}
              />
            </div>

            {/* Pos X */}
            <div className="flex flex-col gap-1 bg-muted/20 p-2 rounded-lg border border-border/40">
              <Label className="text-[10px] text-muted-foreground flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <MoveHorizontal className="size-3 text-primary/70" />
                  {t("constellationBuilder.posX")}
                </span>
                <span className="font-semibold text-foreground">{bgX}px</span>
              </Label>
              <Slider
                min={-400}
                max={400}
                step={2}
                value={[bgX]}
                onValueChange={(val: number[]) => onXChange(val[0])}
                className="my-1"
                aria-label={t("constellationBuilder.posX")}
              />
            </div>

            {/* Pos Y */}
            <div className="flex flex-col gap-1 bg-muted/20 p-2 rounded-lg border border-border/40">
              <Label className="text-[10px] text-muted-foreground flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <MoveVertical className="size-3 text-primary/70" />
                  {t("constellationBuilder.posY")}
                </span>
                <span className="font-semibold text-foreground">{bgY}px</span>
              </Label>
              <Slider
                min={-300}
                max={300}
                step={2}
                value={[bgY]}
                onValueChange={(val: number[]) => onYChange(val[0])}
                className="my-1"
                aria-label={t("constellationBuilder.posY")}
              />
            </div>

            {/* Rotation */}
            <div className="flex flex-col gap-1 bg-muted/20 p-2 rounded-lg border border-border/40">
              <Label className="text-[10px] text-muted-foreground flex justify-between items-center font-mono">
                <span className="flex items-center gap-1">
                  <RotateCw className="size-3 text-primary/70" />
                  {t("constellationBuilder.rotation")}
                </span>
                <span className="font-semibold text-foreground">
                  {bgRotation}°
                </span>
              </Label>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[bgRotation]}
                onValueChange={(val: number[]) => onRotationChange(val[0])}
                className="my-1"
                aria-label={t("constellationBuilder.rotation")}
              />
            </div>
          </div>

          {/* Nudge pad */}
          <div className="flex flex-col items-center gap-1 bg-muted/30 p-1.5 rounded-xl border border-border/60 shrink-0">
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest text-center font-mono">
              {t("constellationBuilder.nudge")}
            </span>
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                type="button"
                onClick={() => onNudge("up")}
                className="size-6 bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all cursor-pointer shadow-xs"
                title="Nudge Up"
                aria-label="Nudge Image Up"
              >
                <ArrowUp className="size-3" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onNudge("left")}
                className="size-6 bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all cursor-pointer shadow-xs"
                title="Nudge Left"
                aria-label="Nudge Image Left"
              >
                <ArrowLeft className="size-3" />
              </button>
              <button
                type="button"
                onClick={onResetPosition}
                className="size-6 bg-card/50 border border-border/50 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-accent active:scale-90 transition-all cursor-pointer shadow-xs"
                title="Reset Position"
                aria-label="Reset Image Position"
              >
                <RotateCcw className="size-2.5" />
              </button>
              <button
                type="button"
                onClick={() => onNudge("right")}
                className="size-6 bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all cursor-pointer shadow-xs"
                title="Nudge Right"
                aria-label="Nudge Image Right"
              >
                <ArrowRight className="size-3" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onNudge("down")}
                className="size-6 bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent active:scale-90 transition-all cursor-pointer shadow-xs"
                title="Nudge Down"
                aria-label="Nudge Image Down"
              >
                <ArrowDown className="size-3" />
              </button>
              <div />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
