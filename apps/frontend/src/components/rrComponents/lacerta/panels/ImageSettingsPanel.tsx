"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { CanvasNode, ImageTransformOptions } from "../types";
import { RotateCw, FlipHorizontal, FlipVertical, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageSettingsPanelProps {
  node: CanvasNode;
  getPanelStyle: (node: CanvasNode, width: number) => React.CSSProperties;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setIsDirty: (val: boolean) => void;
}

export default function ImageSettingsPanel({
  node,
  getPanelStyle,
  setNodes,
  setIsDirty,
}: ImageSettingsPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  const transform = node.imageTransform || {};

  const updateTransform = (updates: Partial<ImageTransformOptions>) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== node.id) return n;
        return {
          ...n,
          imageTransform: {
            ...n.imageTransform,
            ...updates,
          },
        };
      }),
    );
    setIsDirty(true);
  };

  const handleReset = () => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== node.id) return n;
        const { imageTransform, ...rest } = n;
        return rest;
      }),
    );
    setIsDirty(true);
  };

  return (
    <div
      className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-3.5 flex flex-col pointer-events-auto transition-all w-[270px] select-none"
      style={getPanelStyle(node, 270)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2.5 shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="h-3 w-3 text-primary" />
          {t("lacerta.canvasEditor.imageTransform", "Image Transformations")}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title={t("lacerta.canvasEditor.resetTransform", "Reset Transformations")}
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 text-[10px]">
        {/* Quick Transformations: Rotate & Flip */}
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-muted-foreground text-[9px] uppercase tracking-wider">
            {t("lacerta.canvasEditor.orientation", "Orientation")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateTransform({
                  rotation: ((transform.rotation || 0) + 90) % 360,
                })
              }
              className="flex-1 py-1 px-2 bg-muted hover:bg-muted/80 rounded border border-border flex items-center justify-center gap-1 font-bold text-[10px] transition-colors"
            >
              <RotateCw className="h-3 w-3" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={() => updateTransform({ flipX: !transform.flipX })}
              className={cn(
                "py-1 px-2 rounded border border-border flex items-center justify-center gap-1 font-bold text-[10px] transition-colors",
                transform.flipX
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
              title="Flip Horizontally"
            >
              <FlipHorizontal className="h-3 w-3" />
              <span>Flip X</span>
            </button>
            <button
              type="button"
              onClick={() => updateTransform({ flipY: !transform.flipY })}
              className={cn(
                "py-1 px-2 rounded border border-border flex items-center justify-center gap-1 font-bold text-[10px] transition-colors",
                transform.flipY
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
              title="Flip Vertically"
            >
              <FlipVertical className="h-3 w-3" />
              <span>Flip Y</span>
            </button>
          </div>
        </div>

        {/* Object Fit Dropdown */}
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-muted-foreground text-[9px] uppercase tracking-wider">
            {t("lacerta.canvasEditor.objectFit", "Fit Mode")}
          </span>
          <select
            value={transform.objectFit || "contain"}
            onChange={(e) => updateTransform({ objectFit: e.target.value as any })}
            className="w-full bg-muted border border-border rounded px-2 py-1 font-bold text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="contain">Contain (Aspect Ratio)</option>
            <option value="cover">Cover (Fill & Crop)</option>
            <option value="fill">Fill (Stretch)</option>
            <option value="scale-down">Scale Down</option>
          </select>
        </div>

        {/* Filter Sliders */}
        <div className="flex flex-col gap-2 pt-1 border-t border-border/50">
          <span className="font-semibold text-muted-foreground text-[9px] uppercase tracking-wider">
            {t("lacerta.canvasEditor.filters", "Filters & Effects")}
          </span>

          {/* Opacity */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Opacity</span>
            <input
              type="range"
              min={10}
              max={100}
              value={transform.opacity ?? 100}
              onChange={(e) => updateTransform({ opacity: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.opacity ?? 100}%</span>
          </div>

          {/* Brightness */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Brightness</span>
            <input
              type="range"
              min={20}
              max={200}
              value={transform.brightness ?? 100}
              onChange={(e) => updateTransform({ brightness: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.brightness ?? 100}%</span>
          </div>

          {/* Contrast */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Contrast</span>
            <input
              type="range"
              min={20}
              max={200}
              value={transform.contrast ?? 100}
              onChange={(e) => updateTransform({ contrast: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.contrast ?? 100}%</span>
          </div>

          {/* Saturation */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Saturate</span>
            <input
              type="range"
              min={0}
              max={200}
              value={transform.saturation ?? 100}
              onChange={(e) => updateTransform({ saturation: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.saturation ?? 100}%</span>
          </div>

          {/* Blur */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Blur</span>
            <input
              type="range"
              min={0}
              max={20}
              value={transform.blur ?? 0}
              onChange={(e) => updateTransform({ blur: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.blur ?? 0}px</span>
          </div>

          {/* Grayscale */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Grayscale</span>
            <input
              type="range"
              min={0}
              max={100}
              value={transform.grayscale ?? 0}
              onChange={(e) => updateTransform({ grayscale: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.grayscale ?? 0}%</span>
          </div>

          {/* Border Radius */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground w-16 truncate">Corner Radius</span>
            <input
              type="range"
              min={0}
              max={40}
              value={transform.borderRadius ?? 0}
              onChange={(e) => updateTransform({ borderRadius: Number(e.target.value) })}
              className="flex-1 h-1 bg-muted rounded appearance-none cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold">{transform.borderRadius ?? 0}px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
