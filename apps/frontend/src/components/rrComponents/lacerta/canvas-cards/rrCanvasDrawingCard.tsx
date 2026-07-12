"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { CanvasNode, Stroke, Point } from "../CanvasEditor";
import { ramerDouglasPeucker } from "@/lib/coordinates";

interface RrCanvasDrawingCardProps {
  node: CanvasNode;
  zoom: number;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasDrawingCard({
  node,
  zoom,
  isLocked = false,
  onNodeUpdate,
}: RrCanvasDrawingCardProps) {
  const [activeDrawColor, setActiveDrawColor] =
    useState<string>("var(--primary)");
  const [activeDrawWidth, setActiveDrawWidth] = useState<number>(4);
  const [activeBrushType, setActiveBrushType] = useState<
    "pencil" | "calligraphy" | "highlighter" | "dashed" | "dotted"
  >("pencil");
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [drawingStroke, setDrawingStroke] = useState<Stroke | null>(null);

  const getLocalDrawingCoords = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ): Point | null => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handleDrawingStart = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (isLocked) return;
    e.stopPropagation();

    // Check for middle click (button === 1) to erase instead of draw
    if ("button" in e && e.button === 1) {
      e.preventDefault();
      setIsErasing(true);
      return;
    }

    const coords = getLocalDrawingCoords(e);
    if (!coords) return;

    let dasharray: string | undefined = undefined;
    let opacity: number | undefined = undefined;
    let cap: "round" | "square" | "butt" = "round";

    if (activeBrushType === "dashed") {
      dasharray = "8 8";
    } else if (activeBrushType === "dotted") {
      dasharray = "1 8";
    } else if (activeBrushType === "highlighter") {
      opacity = 0.45;
      cap = "square";
    } else if (activeBrushType === "calligraphy") {
      opacity = 0.85;
      cap = "square";
    }

    setDrawingStroke({
      points: [coords],
      color: isErasing ? "transparent" : activeDrawColor,
      width: activeDrawWidth,
      dasharray,
      opacity,
      cap,
    });
  };

  const handleDrawingMove = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (isLocked) return;
    e.stopPropagation();

    if (isErasing) {
      if ("preventDefault" in e) e.preventDefault();
      const coords = getLocalDrawingCoords(e);
      if (coords) {
        // Eraser logic
        const ERASE_RADIUS = Math.min(60, Math.max(12, activeDrawWidth * 1.6));
        const lines = node.lines || [];
        const newLines: Stroke[] = [];
        let linesChanged = false;

        for (const line of lines) {
          const segments: Point[][] = [];
          let currentSegment: Point[] = [];

          for (const p of line.points) {
            const dist = Math.hypot(p.x - coords.x, p.y - coords.y);
            if (dist <= ERASE_RADIUS) {
              if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
              }
              linesChanged = true;
            } else {
              currentSegment.push(p);
            }
          }

          if (currentSegment.length > 0) {
            segments.push(currentSegment);
          }

          for (const seg of segments) {
            if (seg.length > 0) {
              newLines.push({
                ...line,
                points: seg,
              });
            }
          }
        }

        if (linesChanged) {
          onNodeUpdate({ lines: newLines });
        }
      }
      return;
    }

    if (!drawingStroke) return;
    const coords = getLocalDrawingCoords(e);
    if (!coords) return;

    setDrawingStroke({
      ...drawingStroke,
      points: [...drawingStroke.points, coords],
    });
  };

  const handleDrawingEnd = () => {
    if (isLocked) return;
    if (isErasing) {
      setIsErasing(false);
      return;
    }
    if (drawingStroke && drawingStroke.points.length > 1) {
      const simplifiedPoints = ramerDouglasPeucker(drawingStroke.points, 1.5);
      onNodeUpdate({
        lines: [...(node.lines || []), { ...drawingStroke, points: simplifiedPoints }],
      });
    }
    setDrawingStroke(null);
  };

  const handleDrawingClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeUpdate({ lines: [] });
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-card/65 overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      {/* Sketchpad Tool Options Panel */}
      {!isLocked && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/10 shrink-0 text-[9px] select-none">
        <div className="flex items-center gap-2">
          {/* Colors */}
          <div className="flex items-center gap-1">
            {[
              "var(--primary)",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#3b82f6",
              "#a855f7",
            ].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveDrawColor(c);
                  setIsErasing(false);
                }}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  activeDrawColor === c && !isErasing
                    ? "scale-125 border-foreground"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}

            {/* Custom Color Picker */}
            <div
              className={`relative w-3 h-3 rounded-full overflow-hidden border transition-all bg-linear-to-tr from-rose-500 via-green-500 to-blue-500 cursor-pointer flex items-center justify-center shrink-0 ${
                !isErasing &&
                ![
                  "var(--primary)",
                  "#10b981",
                  "#f59e0b",
                  "#ef4444",
                  "#3b82f6",
                  "#a855f7",
                ].includes(activeDrawColor)
                  ? "scale-125 border-foreground"
                  : "border-border"
              }`}
            >
              <input
                type="color"
                value={
                  activeDrawColor.startsWith("var")
                    ? "#3b82f6"
                    : activeDrawColor
                }
                onChange={(e) => {
                  setActiveDrawColor(e.target.value);
                  setIsErasing(false);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Custom Color"
              />
            </div>

            {/* Eraser Toggle */}
            <button
              onClick={() => setIsErasing(!isErasing)}
              className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all ${
                isErasing
                  ? "bg-rose-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              Eraser
            </button>
          </div>

          <div className="w-px h-3 bg-border mx-1" />

          {/* Width */}
          <span className="text-muted-foreground">{activeDrawWidth}px</span>
          <input
            type="range"
            min={1}
            max={20}
            value={activeDrawWidth}
            onChange={(e) => setActiveDrawWidth(parseInt(e.target.value))}
            className="w-12 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
          />

          <div className="w-px h-3 bg-border mx-1" />

          {/* Brush Type */}
          <select
            value={activeBrushType}
            onChange={(e) => {
              setActiveBrushType(e.target.value as any);
              setIsErasing(false);
            }}
            className="bg-transparent border-0 font-bold focus:outline-none cursor-pointer"
          >
            <option value="pencil">Pencil</option>
            <option value="calligraphy">Chisel</option>
            <option value="highlighter">Highlighter</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>

        <button
          onClick={handleDrawingClear}
          className="flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded-md transition-all text-[8px] font-bold"
          title="Clear Canvas"
        >
          <Trash2 className="h-3 w-3 shrink-0" />
          <span>Clear Canvas</span>
        </button>
      </div>
      )}

      {/* SVG Canvas Area */}
      <div className="flex-1 w-full min-h-0 relative select-none">
        <svg
          className="w-full h-full cursor-crosshair bg-slate-900/1 dark:bg-slate-50/1"
          onMouseDown={handleDrawingStart}
          onMouseMove={handleDrawingMove}
          onMouseUp={handleDrawingEnd}
          onMouseLeave={handleDrawingEnd}
          onTouchStart={handleDrawingStart}
          onTouchMove={handleDrawingMove}
          onTouchEnd={handleDrawingEnd}
        >
          {/* Render Saved Lines */}
          {(node.lines || []).map((line, idx) => (
            <path
              key={idx}
              d={`M ${line.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width}
              strokeDasharray={line.dasharray}
              strokeLinecap={line.cap || "round"}
              strokeLinejoin="round"
              opacity={line.opacity}
            />
          ))}

          {/* Render Active Stroke */}
          {drawingStroke && drawingStroke.points.length > 1 && (
            <path
              d={`M ${drawingStroke.points.map((p) => `${p.x} ${p.y}`).join(" L ")}`}
              fill="none"
              stroke={isErasing ? "var(--destructive)" : drawingStroke.color}
              strokeWidth={drawingStroke.width}
              strokeDasharray={drawingStroke.dasharray}
              strokeLinecap={drawingStroke.cap || "round"}
              strokeLinejoin="round"
              opacity={drawingStroke.opacity}
            />
          )}
        </svg>
      </div>
    </div>
  );
}
