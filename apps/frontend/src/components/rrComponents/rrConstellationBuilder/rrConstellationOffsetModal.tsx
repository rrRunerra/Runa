"use client";

import React, { ChangeEvent } from "react";
import { Compass, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StarMap } from "../../stars/StarMap";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";
import { Bookmark } from "./types";

interface RrConstellationOffsetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRa: number;
  setTargetRa: (ra: number) => void;
  targetDec: number;
  setTargetDec: (dec: number) => void;
  bookmarks: Bookmark[];
  currentConstellation: any;
}

export function RrConstellationOffsetModal({
  open,
  onOpenChange,
  targetRa,
  setTargetRa,
  targetDec,
  setTargetDec,
  bookmarks,
  currentConstellation,
}: RrConstellationOffsetModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [showRefConstellations, setShowRefConstellations] =
    React.useState<boolean>(true);
  const [showCustomPreview, setShowCustomPreview] =
    React.useState<boolean>(true);
  const [showBookmarks, setShowBookmarks] = React.useState<boolean>(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-265 w-[95vw] h-[90vh] max-h-205 p-0 overflow-hidden bg-background border border-border/80 shadow-2xl rounded-2xl flex flex-col font-sans text-foreground z-60">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Compass className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold tracking-wide">
                {t("constellationBuilder.selectSkyTargetOffset")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("constellationBuilder.selectSkyTargetOffsetDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative w-full h-full bg-[#020205] overflow-hidden">
          <StarMap
            width={1000}
            height={580}
            numOfStars={15000}
            constellations={[
              ...(showRefConstellations ? REFERENCE_CONSTELLATIONS : []),
              ...(showBookmarks
                ? bookmarks.map((b) => ({
                    name: b.name,
                    description: b.description || "",
                    redirect: b.redirect || "",
                    id: b.id,
                    stars: b.stars.map((s) => ({
                      ra: s.ra,
                      dec: s.dec,
                      magnitude: s.magnitude,
                      name: s.name,
                    })),
                    connections: b.connections,
                    icon: b.icon || undefined,
                  }))
                : []),
              ...(showCustomPreview ? [currentConstellation] : []),
            ]}
            onMapClick={(ra, dec) => {
              const roundedRa = Number(ra.toFixed(2));
              const roundedDec = Number(dec.toFixed(2));
              setTargetRa(roundedRa);
              setTargetDec(roundedDec);
              toast.success(
                t("constellationBuilder.toastCalibrated", {
                  ra: roundedRa,
                  dec: roundedDec,
                }),
              );
            }}
          >
            {/* Target Offset Beacon/Marker */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
              style={{
                left: targetRa * 15 * 30,
                top: -targetDec * 30,
              }}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute size-10 rounded-full border border-primary/40 bg-primary/5 animate-ping opacity-75" />
                <span className="absolute size-6 rounded-full border border-primary/60 bg-primary/15 animate-pulse" />
                <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px_#818cf8]" />
                <div className="absolute w-14 h-px bg-primary/30" />
                <div className="absolute h-14 w-px bg-primary/30" />
                <div className="absolute top-5 left-5 bg-background/90 backdrop-blur-xs border border-border px-2 py-0.5 rounded-md text-[9px] font-mono text-foreground shadow-md whitespace-nowrap flex items-center gap-1">
                  <span className="size-1 rounded-full bg-primary animate-pulse" />
                  {t("constellationBuilder.centerPoint")}
                </div>
              </div>
            </div>
          </StarMap>

          {/* Floating HUD info panel */}
          <div className="absolute top-4 left-4 z-30 p-3.5 rounded-2xl bg-background/90 dark:bg-zinc-950/90 backdrop-blur-md border border-border/80 shadow-2xl flex flex-col gap-2 max-w-70">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold font-mono">
              {t("constellationBuilder.offsetCalibration")}
            </span>
            <div className="flex flex-col gap-1 bg-muted/40 p-2 rounded-xl border border-border/60">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {t("constellationBuilder.raOffset")}
                </span>
                <span className="text-primary font-bold">
                  {targetRa.toFixed(2)}h
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">
                  {t("constellationBuilder.decOffset")}
                </span>
                <span className="text-primary font-bold">
                  {targetDec.toFixed(2)}°
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showCustomPreview}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShowCustomPreview(e.target.checked)
                  }
                  className="rounded border-input bg-background text-primary size-3.5 focus:ring-0 cursor-pointer"
                />
                {t("constellationBuilder.showCustomPreview")}
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showBookmarks}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShowBookmarks(e.target.checked)
                  }
                  className="rounded border-input bg-background text-primary size-3.5 focus:ring-0 cursor-pointer"
                />
                {t("constellationBuilder.showSavedBookmarks")}
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={showRefConstellations}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setShowRefConstellations(e.target.checked)
                  }
                  className="rounded border-input bg-background text-primary size-3.5 focus:ring-0 cursor-pointer"
                />
                {t("constellationBuilder.showRefConstellations")}
              </label>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2 font-sans">
              {t("constellationBuilder.offsetCalibrationDesc")}
            </p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3 border-t border-border/80 flex justify-end gap-3 bg-muted/20 shrink-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="text-xs sm:text-sm font-semibold h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
            aria-label={t("constellationBuilder.doneCalibrating")}
          >
            <Check className="size-3.5" />
            {t("constellationBuilder.doneCalibrating")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
