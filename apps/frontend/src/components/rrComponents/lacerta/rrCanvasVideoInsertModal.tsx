"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { CanvasNodeType, CanvasNode } from "./types";
import { useTranslation } from "react-i18next";

interface RrCanvasVideoInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  createNodeAtPos: (
    type: CanvasNodeType,
    x: number,
    y: number,
    initialText?: string,
    cardStyle?: "document" | "sticky" | "header",
    imageUrl?: string,
    tableData?: string[][],
    extraProps?: Partial<CanvasNode>
  ) => void;
}

export default function RrCanvasVideoInsertModal({
  isOpen,
  onClose,
  x,
  y,
  createNodeAtPos,
}: RrCanvasVideoInsertModalProps) {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState<string>("");

  if (!isOpen) return null;

  const handleInsert = () => {
    if (videoUrl.trim()) {
      createNodeAtPos(
        "video",
        x,
        y,
        undefined,
        undefined,
        undefined,
        undefined,
        { videoUrl: videoUrl.trim() },
      );
      onClose();
      setVideoUrl("");
    } else {
      toast.error(t("lacerta.canvasVideoInsert.urlRequired", "Please enter a video URL"));
    }
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col select-text">
        <h3 className="text-sm font-bold text-card-foreground">
          {t("lacerta.canvasVideoInsert.title", "Embed Video Card")}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-normal mt-1 mb-4">
          {t("lacerta.canvasVideoInsert.desc", "Enter a YouTube/Vimeo link or direct video link (MP4/WebM) to place an interactive video card on the canvas.")}
        </p>

        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all mb-6 font-medium"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              onClose();
              setVideoUrl("");
            }}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold text-muted-foreground transition-all active:scale-98"
          >
            {t("lacerta.canvasVideoInsert.cancel", "Cancel")}
          </button>
          <button
            onClick={handleInsert}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 rounded-lg text-xs font-semibold text-primary-foreground transition-all shadow-sm active:scale-98"
          >
            {t("lacerta.canvasVideoInsert.embed", "Embed Video")}
          </button>
        </div>
      </div>
    </div>
  );
}
