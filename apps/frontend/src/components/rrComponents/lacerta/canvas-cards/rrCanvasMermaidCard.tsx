"use client";

import React from "react";
import RrCanvasMermaidRenderer from "./rrCanvasMermaidRenderer";
import { CanvasNode } from "../types";

interface RrCanvasMermaidCardProps {
  node: CanvasNode;
}

export default function RrCanvasMermaidCard({ node }: RrCanvasMermaidCardProps) {
  return (
    <div
      className="relative w-full h-full flex flex-col p-3 text-foreground bg-card/65 overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5 shrink-0">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Mermaid Diagram
        </span>
      </div>
      <div className="flex-1 w-full h-full min-h-0 overflow-auto">
        <RrCanvasMermaidRenderer
          code={node.mermaidCode || ""}
          id={node.id}
        />
      </div>
    </div>
  );
}
