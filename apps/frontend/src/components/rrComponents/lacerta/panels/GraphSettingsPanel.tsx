"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { CanvasNode } from "../types";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphSettingsPanelProps {
  node: CanvasNode;
  getPanelStyle: (node: CanvasNode, width: number) => React.CSSProperties;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setIsDirty: (val: boolean) => void;
}

export default function GraphSettingsPanel({
  node,
  getPanelStyle,
  setNodes,
  setIsDirty,
}: GraphSettingsPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all w-[260px]"
      style={getPanelStyle(node, 260)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2 shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("lacerta.canvasEditor.chartSettings", "Chart Settings")}
        </span>
        <div className="flex gap-1">
          {(["bar", "line", "pie"] as const).map((gt) => (
            <button
              key={gt}
              type="button"
              onClick={() => {
                setNodes((prev) =>
                  prev.map((n) =>
                    n.id === node.id ? { ...n, graphType: gt } : n,
                  ),
                );
                setIsDirty(true);
              }}
              className={cn(
                "px-2 py-0.5 rounded text-[9px] font-bold transition-all uppercase",
                node.graphType === gt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              {gt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1.5">
          {(node.graphData || []).map((row, idx) => (
            <div key={idx} className="flex gap-1.5 items-center">
              <input
                type="text"
                value={row.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((prev) =>
                    prev.map((n) => {
                      if (n.id !== node.id) return n;
                      const nextData = [...(n.graphData || [])];
                      nextData[idx] = { ...nextData[idx], name: val };
                      return { ...n, graphData: nextData };
                    }),
                  );
                  setIsDirty(true);
                }}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-[9px] text-foreground focus:outline-none focus:border-primary font-medium"
                placeholder={t("lacerta.canvasEditor.label", "Label")}
              />
              <input
                type="number"
                value={row.value}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNodes((prev) =>
                    prev.map((n) => {
                      if (n.id !== node.id) return n;
                      const nextData = [...(n.graphData || [])];
                      nextData[idx] = { ...nextData[idx], value: val };
                      return { ...n, graphData: nextData };
                    }),
                  );
                  setIsDirty(true);
                }}
                className="w-16 bg-background border border-border rounded px-2 py-1 text-[9px] text-foreground focus:outline-none focus:border-primary font-medium"
                placeholder={t("lacerta.canvasEditor.value", "Value")}
              />
              <button
                type="button"
                onClick={() => {
                  setNodes((prev) =>
                    prev.map((n) => {
                      if (n.id !== node.id) return n;
                      return {
                        ...n,
                        graphData: (n.graphData || []).filter((_, i) => i !== idx),
                      };
                    }),
                  );
                  setIsDirty(true);
                }}
                className="p-1 hover:bg-destructive/10 text-destructive hover:text-destructive rounded transition-all"
                title="Delete Row"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setNodes((prev) =>
                prev.map((n) => {
                  if (n.id !== node.id) return n;
                  return {
                    ...n,
                    graphData: [
                      ...(n.graphData || []),
                      {
                        name: `Item ${String.fromCharCode(
                          65 + (n.graphData || []).length,
                        )}`,
                        value: 50,
                      },
                    ],
                  };
                }),
              );
              setIsDirty(true);
            }}
            className="mt-1 text-[9px] font-semibold text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1.5 border border-dashed border-border hover:border-muted-foreground/35 rounded transition-all"
          >
            <Plus className="h-3 w-3" /> {t("lacerta.canvasEditor.addDataRow", "Add Data Row")}
          </button>
        </div>
      </div>
    </div>
  );
}
