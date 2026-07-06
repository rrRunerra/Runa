"use client";

import React from "react";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasEmojiCardProps {
  node: CanvasNode;
}

export default function RrCanvasEmojiCard({ node }: RrCanvasEmojiCardProps) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center bg-transparent select-none overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <span className="text-[120px] leading-none select-none filter drop-shadow-md transition-all">
        {node.emoji || "🎯"}
      </span>
    </div>
  );
}
