"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { CanvasNode } from "../types";

interface MermaidSettingsPanelProps {
  node: CanvasNode;
  getPanelStyle: (node: CanvasNode, width: number) => React.CSSProperties;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setIsDirty: (val: boolean) => void;
}

export default function MermaidSettingsPanel({
  node,
  getPanelStyle,
  setNodes,
  setIsDirty,
}: MermaidSettingsPanelProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-4 flex flex-col pointer-events-auto transition-all w-[320px]"
      style={getPanelStyle(node, 320)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2 shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {node.type === "mermaid"
            ? t("lacerta.canvasEditor.mermaidCode", "Mermaid Diagram Code")
            : t("lacerta.canvasEditor.umlCode", "UML Diagram Code")}
        </span>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          value={node.mermaidCode || ""}
          onChange={(e) => {
            const val = e.target.value;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === node.id ? { ...n, mermaidCode: val } : n,
              ),
            );
            setIsDirty(true);
          }}
          className="flex-1 w-full bg-background border border-border rounded-lg p-3 font-mono text-[10px] text-slate-300 focus:outline-none focus:border-primary resize-none leading-relaxed"
          placeholder={
            node.type === "mermaid" ? "graph TD..." : "classDiagram..."
          }
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = e.currentTarget.value;
              const updated =
                val.substring(0, start) + "    " + val.substring(end);
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === node.id ? { ...n, mermaidCode: updated } : n,
                ),
              );
              setTimeout(() => {
                if (e.currentTarget) {
                  e.currentTarget.selectionStart =
                    e.currentTarget.selectionEnd = start + 4;
                }
              }, 0);
            }
          }}
        />
      </div>
    </div>
  );
}
