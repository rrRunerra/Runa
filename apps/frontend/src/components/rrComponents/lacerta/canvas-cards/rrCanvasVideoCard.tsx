"use client";

import React from "react";
import { Video } from "lucide-react";
import { CanvasNode } from "../types";
import { useTranslation } from "react-i18next";

interface RrCanvasVideoCardProps {
  node: CanvasNode;
  selected: boolean;
}

export default function RrCanvasVideoCard({ node, selected }: RrCanvasVideoCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="relative w-full h-full flex flex-col bg-slate-950/50"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {/* Header Drag Handle Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/25 border-b border-border shrink-0 text-[10px] select-none">
        <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
          <Video className="h-3.5 w-3.5 text-rose-500" />
          <span>{t("lacerta.canvasEditor.videoPlayer", "Video Player")}</span>
        </div>
      </div>

      {/* Video Content Block */}
      <div className="flex-1 min-h-0 w-full relative bg-slate-950">
        {node.videoUrl ? (
          node.videoUrl.includes("youtube.com") ||
          node.videoUrl.includes("youtu.be") ||
          node.videoUrl.includes("vimeo.com") ? (
            <iframe
              src={
                node.videoUrl.includes("youtube.com") ||
                node.videoUrl.includes("youtu.be")
                  ? `https://www.youtube.com/embed/${
                      node.videoUrl.includes("watch?v=")
                        ? node.videoUrl.split("watch?v=")[1]?.split("&")[0]
                        : node.videoUrl.split("/").pop()
                    }`
                  : `https://player.vimeo.com/video/${node.videoUrl.split("/").pop()}`
              }
              className="w-full h-full border-0 select-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={node.videoUrl}
              controls
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <Video className="h-8 w-8 text-slate-700" />
            <span className="text-[10px] font-semibold">{t("lacerta.canvasEditor.noVideoLoaded", "No Video Loaded")}</span>
          </div>
        )}

        {/* Pointer Hijack Protection Overlay */}
        {!selected && (
          <div className="absolute inset-0 bg-transparent z-10 cursor-pointer" />
        )}
      </div>
    </div>
  );
}
