"use client";

import React from "react";
import { Film } from "lucide-react";
import { CanvasNode } from "../types";

interface RrCanvasGifCardProps {
  node: CanvasNode;
}

export default function RrCanvasGifCard({ node }: RrCanvasGifCardProps) {
  const transform = node.imageTransform;
  const transformStyle: React.CSSProperties = transform
    ? {
        transform: `rotate(${transform.rotation || 0}deg) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
        objectFit: transform.objectFit || "cover",
        filter: [
          transform.brightness !== undefined ? `brightness(${transform.brightness}%)` : "",
          transform.contrast !== undefined ? `contrast(${transform.contrast}%)` : "",
          transform.saturation !== undefined ? `saturate(${transform.saturation}%)` : "",
          transform.blur !== undefined ? `blur(${transform.blur}px)` : "",
          transform.grayscale !== undefined ? `grayscale(${transform.grayscale}%)` : "",
          transform.sepia !== undefined ? `sepia(${transform.sepia}%)` : "",
        ].filter(Boolean).join(" ") || undefined,
        opacity: transform.opacity !== undefined ? transform.opacity / 100 : undefined,
        borderRadius: transform.borderRadius !== undefined ? `${transform.borderRadius}px` : undefined,
      }
    : { objectFit: "cover" };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-slate-950/50 overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {node.gifUrl ? (
        <img
          src={node.gifUrl}
          alt="GIF"
          className="w-full h-full select-none pointer-events-none transition-all duration-150"
          style={transformStyle}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Film className="h-8 w-8 text-slate-700 animate-pulse" />
          <span className="text-[10px] font-semibold">No GIF Loaded</span>
        </div>
      )}
    </div>
  );
}
