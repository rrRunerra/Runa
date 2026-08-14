"use client";

import React from "react";
import {
  HelpCircle as HelpIcon,
  MousePointerClick,
  Link2,
  XCircle,
  Trash2,
  Undo2,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function RrConstellationGuideTab(): React.JSX.Element {
  const { t } = useTranslation();

  const guides = [
    {
      icon: MousePointerClick,
      title: t("constellationBuilder.guideClickCanvas"),
      desc: t("constellationBuilder.guideClickCanvasDesc"),
      kbd: "Click Canvas",
    },
    {
      icon: MousePointerClick,
      title: t("constellationBuilder.guideClickStar"),
      desc: t("constellationBuilder.guideClickStarDesc"),
      kbd: "Click Star",
    },
    {
      icon: Link2,
      title: t("constellationBuilder.guideShiftClickStar"),
      desc: t("constellationBuilder.guideShiftClickStarDesc"),
      kbd: "Shift + Click",
    },
    {
      icon: XCircle,
      title: t("constellationBuilder.guideDeselectStar"),
      desc: t("constellationBuilder.guideDeselectStarDesc"),
      kbd: "Right-Click / Esc",
    },
    {
      icon: Trash2,
      title: t("constellationBuilder.guideDeleteStar"),
      desc: t("constellationBuilder.guideDeleteStarDesc"),
      kbd: "Delete / Backspace",
    },
    {
      icon: Undo2,
      title: t("constellationBuilder.guideUndoStar"),
      desc: t("constellationBuilder.guideUndoStarDesc"),
      kbd: "Ctrl + Z",
    },
    {
      icon: ZoomIn,
      title: "Zoom & Pan:",
      desc: "Scroll mouse wheel or use zoom HUD buttons to scale view.",
      kbd: "Wheel / +/-",
    },
  ];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <HelpIcon className="size-3.5 text-primary" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
          {t("constellationBuilder.workspaceGuide")}
        </h3>
      </div>

      <div className="flex flex-col gap-2 max-h-115 overflow-y-auto pr-1">
        {guides.map((g, idx) => {
          const Icon = g.icon;
          return (
            <div
              key={idx}
              className="bg-muted/20 border border-border/60 hover:border-border p-2.5 rounded-xl flex items-start gap-3 transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0 mt-0.5">
                <Icon className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {g.title}
                  </span>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-muted border border-border text-muted-foreground shrink-0 shadow-2xs">
                    {g.kbd}
                  </kbd>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {g.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
