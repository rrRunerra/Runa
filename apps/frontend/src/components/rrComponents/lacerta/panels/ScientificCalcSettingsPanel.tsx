"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CanvasNode } from "../types";

interface ScientificCalcSettingsPanelProps {
  node: CanvasNode;
  getPanelStyle: (node: CanvasNode, width: number) => React.CSSProperties;
  lockedElements: Record<string, { username: string; senderId: string }>;
  setNodes: React.Dispatch<React.SetStateAction<CanvasNode[]>>;
  setIsDirty: (val: boolean) => void;
}

export default function ScientificCalcSettingsPanel({
  node,
  getPanelStyle,
  lockedElements,
  setNodes,
  setIsDirty,
}: ScientificCalcSettingsPanelProps): React.JSX.Element {
  const { t } = useTranslation();
  const [calcVarName, setCalcVarName] = useState("");
  const [calcVarVal, setCalcVarVal] = useState("");

  const isLocked = !!lockedElements[node.id];

  return (
    <div
      className="absolute z-30 bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-3 flex flex-col pointer-events-auto transition-all w-[220px]"
      style={getPanelStyle(node, 220)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-2 shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("lacerta.canvasEditor.shiftVarSettings", "Shift & Variable Settings")}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-0 text-[10px]">
        {/* Custom Variables Editor */}
        <div className="flex flex-col gap-1 bg-muted/40 border border-border/30 p-2 rounded-xl">
          <span className="font-bold text-muted-foreground uppercase tracking-wide">
            {t("lacerta.canvasEditor.variables", "Variables")}
          </span>
          {!isLocked && (
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="var"
                value={calcVarName}
                onChange={(e) => setCalcVarName(e.target.value)}
                className="w-10 bg-background border border-border/50 rounded px-1 py-0.5 focus:outline-none text-[9px]"
              />
              <input
                type="text"
                placeholder="val"
                value={calcVarVal}
                onChange={(e) => setCalcVarVal(e.target.value)}
                className="flex-1 bg-background border border-border/50 rounded px-1 py-0.5 focus:outline-none text-[9px]"
              />
              <button
                onClick={() => {
                  if (!calcVarName.trim() || !calcVarVal.trim()) return;
                  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(calcVarName)) return;
                  setNodes((prev) =>
                    prev.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            variables: {
                              ...(n.variables || {}),
                              [calcVarName.trim()]: calcVarVal.trim(),
                            },
                          }
                        : n,
                    ),
                  );
                  setIsDirty(true);
                  setCalcVarName("");
                  setCalcVarVal("");
                }}
                className="px-1 bg-primary text-primary-foreground rounded hover:bg-primary/95 font-bold text-[9px]"
              >
                +
              </button>
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-[70px] overflow-y-auto pr-1 font-mono">
            {Object.entries(node.variables || {}).map(([name, val]) => (
              <div
                key={name}
                className="flex justify-between items-center bg-muted/70 px-1.5 py-0.5 rounded text-[8px]"
              >
                <span
                  onClick={() => {
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === node.id
                          ? { ...n, text: (n.text || "") + name }
                          : n,
                      ),
                    );
                    setIsDirty(true);
                  }}
                  className="cursor-pointer font-bold text-primary hover:underline truncate max-w-[120px]"
                >
                  {name} = {val}
                </span>
                {!isLocked && (
                  <button
                    onClick={() => {
                      const updatedVars = { ...(node.variables || {}) };
                      delete updatedVars[name];
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === node.id ? { ...n, variables: updatedVars } : n,
                        ),
                      );
                      setIsDirty(true);
                    }}
                    className="text-destructive font-bold hover:scale-115 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shift Symbols Reference Keypad */}
        <div className="flex flex-col gap-1.5 bg-muted/40 border border-border/30 p-2.5 rounded-xl">
          <span className="font-bold text-muted-foreground uppercase tracking-wide">
            {t("lacerta.canvasEditor.shiftOptions", "Shift Options")}
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "sin⁻¹", value: "asin(" },
              { label: "cos⁻¹", value: "acos(" },
              { label: "tan⁻¹", value: "atan(" },
              { label: "sinh⁻¹", value: "asinh(" },
              { label: "cosh⁻¹", value: "acosh(" },
              { label: "tanh⁻¹", value: "atanh(" },
              { label: "³√■", value: "nthRoot(■, 3)" },
              { label: "x!", value: "!" },
              { label: "Ran#", value: "random()" },
              { label: "log_N", value: "log(■, N)" },
              { label: "Mean", value: "mean(" },
              { label: "StdDev", value: "std(" },
              { label: "Derivative", value: "derivative(" },
              { label: "Simplify", value: "simplify(" },
              { label: "Integrate", value: "integrate(" },
              { label: "Matrix", value: "[1, 2; 3, 4]" },
              { label: "Complex", value: "3 + 2i" },
              { label: "Unit Conv", value: "10 inch to cm" },
            ].map((s) => (
              <button
                key={s.label}
                disabled={isLocked}
                onClick={() => {
                  setNodes((prev) =>
                    prev.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            text: (n.text || "") + s.value,
                          }
                        : n,
                    ),
                  );
                  setIsDirty(true);
                }}
                className="py-1 text-[8px] bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-500 rounded font-semibold active:scale-95 transition-transform"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
