"use client";

import React, { useState, useRef } from "react";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasGroupCardProps {
  node: CanvasNode;
  selected: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasGroupCard({
  node,
  selected,
  onNodeUpdate,
}: RrCanvasGroupCardProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTitleBlur = () => {
    setEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setEditing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Group Frame Header – drag handle */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 shrink-0 cursor-grab active:cursor-grabbing"
        data-group-drag-handle="true"
      >
        {/* Grid icon */}
        <svg
          className="w-3 h-3 text-muted-foreground/60 shrink-0"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="1" y="1" width="4" height="4" rx="0.5" />
          <rect x="7" y="1" width="4" height="4" rx="0.5" />
          <rect x="1" y="7" width="4" height="4" rx="0.5" />
          <rect x="7" y="7" width="4" height="4" rx="0.5" />
        </svg>

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 text-xs font-semibold bg-transparent border-none outline-none text-foreground/80 min-w-0"
            value={node.text || "Group"}
            onChange={(e) => onNodeUpdate({ text: e.target.value })}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-xs font-semibold text-foreground/70 truncate select-none"
            onDoubleClick={handleTitleDoubleClick}
            title="Double-click to rename"
          >
            {node.text || "Group"}
          </span>
        )}

        {node.lockPosition && (
          <span className="text-[10px] text-muted-foreground">🔒</span>
        )}
        {selected && !node.lockPosition && (
          <span className="text-[10px] text-primary/70">drag to move group</span>
        )}
      </div>

      {/* Group body – transparent, children are separate CanvasEditor nodes */}
      <div className="flex-1 min-h-0" />
    </div>
  );
}
