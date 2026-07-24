"use client";

import React from "react";
import { CanvasNode, Scene3DData } from "../types";
import { Box, Edit3, Play, Pause, RotateCcw, Grid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Object3DSettingsPanelProps {
  node: CanvasNode;
  getPanelStyle: (node: CanvasNode, width: number) => React.CSSProperties;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setIsDirty: (val: boolean) => void;
  onOpenStudio?: (node: CanvasNode) => void;
}

export default function Object3DSettingsPanel({
  node,
  getPanelStyle,
  setNodes,
  setIsDirty,
  onOpenStudio,
}: Object3DSettingsPanelProps): React.JSX.Element {
  const sceneData: Scene3DData = node.scene3dData || {
    objects: [],
    environment: {
      backgroundColor: "#0f172a",
      gridVisible: true,
      autoRotate: false,
      autoRotateSpeed: 1.5,
      ambientLightColor: "#ffffff",
      ambientLightIntensity: 0.8,
      directionalLightColor: "#38bdf8",
      directionalLightIntensity: 1.5,
      directionalLightPosition: [5, 8, 5],
    },
  };

  const isAutoRotate = sceneData.environment?.autoRotate ?? false;
  const isGridVisible = sceneData.environment?.gridVisible ?? true;

  const updateEnvironment = (updates: Partial<typeof sceneData.environment>) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== node.id) return n;
        const currentData = n.scene3dData || sceneData;
        return {
          ...n,
          scene3dData: {
            ...currentData,
            environment: {
              ...currentData.environment,
              ...updates,
            },
          },
        };
      })
    );
    setIsDirty(true);
  };

  return (
    <div
      className="absolute z-30 bg-popover/95 backdrop-blur-md border border-border text-popover-foreground rounded-2xl shadow-2xl p-3 flex flex-col pointer-events-auto transition-all w-[260px]"
      style={getPanelStyle(node, 260)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
          <Box className="w-3.5 h-3.5" />
          <span>3D Scene Controls</span>
        </div>

        {onOpenStudio && (
          <button
            type="button"
            onClick={() => onOpenStudio(node)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-all shadow-xs"
          >
            <Edit3 className="w-3 h-3" />
            3D Studio
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {/* Toggle Auto-rotate */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            {isAutoRotate ? <Pause className="w-3 h-3 text-indigo-400" /> : <Play className="w-3 h-3" />}
            Auto Rotation
          </span>
          <button
            type="button"
            onClick={() => updateEnvironment({ autoRotate: !isAutoRotate })}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase",
              isAutoRotate ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {isAutoRotate ? "On" : "Off"}
          </button>
        </div>

        {/* Toggle Grid */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <Grid className="w-3 h-3 text-muted-foreground" />
            Grid Helper
          </span>
          <button
            type="button"
            onClick={() => updateEnvironment({ gridVisible: !isGridVisible })}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase",
              isGridVisible ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {isGridVisible ? "Shown" : "Hidden"}
          </button>
        </div>

        {/* Object count badge */}
        <div className="pt-1.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>Objects in Scene:</span>
          <span className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">
            {sceneData.objects?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
