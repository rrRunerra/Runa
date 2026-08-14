"use client";

import React from "react";
import { Undo2, Trash2, X, RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RrConstellationToolbarProps {
  starsCount: number;
  connectionsCount: number;
  activeStarIndex: number | null;
  onUndoLast: () => void;
  onDeleteActive: () => void;
  onDeselect: () => void;
  onClearWorkspace: () => void;
}

export function RrConstellationToolbar({
  starsCount,
  connectionsCount,
  activeStarIndex,
  onUndoLast,
  onDeleteActive,
  onDeselect,
  onClearWorkspace,
}: RrConstellationToolbarProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-card/60 border border-border/80 p-2 sm:p-2.5 rounded-xl shrink-0 backdrop-blur-xs">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Undo Button */}
        <Button
          type="button"
          onClick={onUndoLast}
          disabled={starsCount === 0}
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium rounded-lg border-border hover:bg-muted cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("constellationBuilder.undoLast")}
        >
          <Undo2 className="size-3.5 mr-1 text-muted-foreground" />
          {t("constellationBuilder.undoLast")}
        </Button>

        {/* Active Star Controls */}
        {activeStarIndex !== null && (
          <>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-mono">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>#{activeStarIndex}</span>
            </div>

            <Button
              type="button"
              onClick={onDeleteActive}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium rounded-lg border-destructive/25 text-destructive hover:bg-destructive/10 cursor-pointer transition-all active:scale-95"
              aria-label={t("constellationBuilder.deleteActive")}
            >
              <Trash2 className="size-3.5 mr-1" />
              {t("constellationBuilder.deleteActive")}
            </Button>

            <Button
              type="button"
              onClick={onDeselect}
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              aria-label={t("constellationBuilder.deselect")}
            >
              <X className="size-3.5 mr-1" />
              {t("constellationBuilder.deselect")}
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Stats Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-primary" />
            <strong className="text-foreground">{starsCount}</strong>{" "}
            {t("constellationBuilder.stars")}
          </span>
          <span className="text-border">•</span>
          <span>
            <strong className="text-foreground">{connectionsCount}</strong>{" "}
            {t("constellationBuilder.connections")}
          </span>
        </div>

        {/* Clear All */}
        <Button
          type="button"
          onClick={onClearWorkspace}
          disabled={starsCount === 0}
          variant="ghost"
          size="sm"
          className="h-8 text-xs font-medium rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={t("constellationBuilder.clearWorkspace")}
        >
          <RefreshCw className="size-3.5 mr-1" />
          {t("constellationBuilder.clearWorkspace")}
        </Button>
      </div>
    </div>
  );
}
