"use client";

import React from "react";
import { Film } from "lucide-react";
import { CanvasNode } from "../types";

interface RrCanvasGifCardProps {
  node: CanvasNode;
}

export default function RrCanvasGifCard({ node }: RrCanvasGifCardProps) {
  return (
    <div
      className="relative w-full h-full flex flex-col bg-slate-950/50"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {node.gifUrl ? (
        <img
          src={node.gifUrl}
          alt="GIF"
          className="w-full h-full object-cover select-none pointer-events-none"
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
