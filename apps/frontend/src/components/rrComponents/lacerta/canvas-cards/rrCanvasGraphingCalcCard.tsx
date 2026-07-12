"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CanvasNode } from "../CanvasEditor";
import { create, all } from "mathjs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Calculator, Plus, Trash2, Clipboard, Settings2 } from "lucide-react";

const math = create(all);

interface RrCanvasGraphingCalcCardProps {
  node: CanvasNode;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasGraphingCalcCard({
  node,
  isLocked = false,
  onNodeUpdate,
}: RrCanvasGraphingCalcCardProps) {
  const equations = node.equations || ["x^2"];
  const variables = node.variables || {};

  const [inputEq, setInputEq] = useState("");
  const [minX, setMinX] = useState(-10);
  const [maxX, setMaxX] = useState(10);
  const [minY, setMinY] = useState(-10);
  const [maxY, setMaxY] = useState(10);
  const [showConfig, setShowConfig] = useState(false);

  // Variable addition states
  const [varNameInput, setVarNameInput] = useState("");
  const [varValInput, setVarValInput] = useState("");

  const handleAddEquation = () => {
    if (isLocked || !inputEq.trim()) return;
    onNodeUpdate({ equations: [...equations, inputEq.trim()] });
    setInputEq("");
  };

  const handleRemoveEquation = (index: number) => {
    if (isLocked) return;
    onNodeUpdate({ equations: equations.filter((_, i) => i !== index) });
  };

  const handleAddVariable = () => {
    if (isLocked || !varNameInput.trim() || !varValInput.trim()) return;
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(varNameInput)) return;
    onNodeUpdate({
      variables: { ...variables, [varNameInput.trim()]: varValInput.trim() },
    });
    setVarNameInput("");
    setVarValInput("");
  };

  const handleRemoveVariable = (name: string) => {
    if (isLocked) return;
    const nextVars = { ...variables };
    delete nextVars[name];
    onNodeUpdate({ variables: nextVars });
  };

  const serializedEquations = JSON.stringify(equations);
  const serializedVariables = JSON.stringify(variables);

  // Compile and evaluate equations for plotting
  const plotData = useMemo(() => {
    const pointsCount = 60;
    const step = (maxX - minX) / pointsCount;
    const compiledData: any[] = [];

    // Parse variables scope
    const scope: Record<string, number> = {};
    Object.entries(variables).forEach(([name, val]) => {
      try {
        scope[name] = Number(math.evaluate(val)) || 0;
      } catch {
        scope[name] = 0;
      }
    });

    // Compile functions
    const parsedEqs = equations.map((eq) => {
      try {
        // Strip out 'f(x) =' or 'y =' if present
        let cleanEq = eq;
        if (eq.includes("=")) {
          cleanEq = eq.split("=")[1].trim();
        }
        return math.compile(cleanEq);
      } catch {
        return null;
      }
    });

    for (let i = 0; i <= pointsCount; i++) {
      const x = minX + i * step;
      const dataRow: Record<string, any> = { x: Number(x.toFixed(2)) };

      parsedEqs.forEach((compiled, idx) => {
        if (!compiled) return;
        try {
          const y = compiled.evaluate({ ...scope, x });
          if (typeof y === "number" && !isNaN(y) && isFinite(y)) {
            // Keep points within visible bounds or slightly beyond to render nicely
            if (y >= minY * 2 && y <= maxY * 2) {
              dataRow[`y_${idx}`] = Number(y.toFixed(4));
            }
          }
        } catch {
          // Skip invalid point
        }
      });
      compiledData.push(dataRow);
    }
    return compiledData;
  }, [serializedEquations, serializedVariables, minX, maxX, minY, maxY]);

  const handleCopyLaTeX = (eq: string) => {
    try {
      let cleanEq = eq;
      if (eq.includes("=")) {
        cleanEq = eq.split("=")[1].trim();
      }
      const tex = math.parse(cleanEq).toTex();
      navigator.clipboard.writeText(tex);
    } catch {
      navigator.clipboard.writeText(eq);
    }
  };

  const lineColors = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#a855f7", // Purple
    "#ef4444", // Rose
    "#f97316", // Orange
    "#14b8a6", // Teal
  ];

  return (
    <div className="w-full h-full flex flex-col p-4 bg-card/65 backdrop-blur-xl border border-border rounded-2xl select-none text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Calculator className="h-4 w-4" />
          <span>Graphing Calculator</span>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main split: Equations on top, graph in center */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Bounds & Variables config panel */}
        {showConfig && (
          <div className="grid grid-cols-2 gap-3 bg-muted/40 border border-border/40 p-3 rounded-xl shrink-0 text-[10px]">
            {/* Axis Limits */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-muted-foreground uppercase tracking-wide">
                Axes Limits
              </span>
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <div>
                  <label className="text-[8px] text-muted-foreground">Min X</label>
                  <input
                    type="number"
                    value={minX}
                    disabled={isLocked}
                    onChange={(e) => setMinX(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-muted-foreground">Max X</label>
                  <input
                    type="number"
                    value={maxX}
                    disabled={isLocked}
                    onChange={(e) => setMaxX(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-muted-foreground">Min Y</label>
                  <input
                    type="number"
                    value={minY}
                    disabled={isLocked}
                    onChange={(e) => setMinY(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-muted-foreground">Max Y</label>
                  <input
                    type="number"
                    value={maxY}
                    disabled={isLocked}
                    onChange={(e) => setMaxY(Number(e.target.value))}
                    className="w-full bg-background border border-border/50 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Custom Variables */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-muted-foreground uppercase tracking-wide">
                Graph Variables
              </span>
              {!isLocked && (
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="var"
                    value={varNameInput}
                    onChange={(e) => setVarNameInput(e.target.value)}
                    className="w-12 bg-background border border-border/50 rounded px-1 py-0.5 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="val"
                    value={varValInput}
                    onChange={(e) => setVarValInput(e.target.value)}
                    className="flex-1 bg-background border border-border/50 rounded px-1 py-0.5 focus:outline-none"
                  />
                  <button
                    onClick={handleAddVariable}
                    className="px-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-bold"
                  >
                    +
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto max-h-[60px] flex flex-col gap-1 pr-1 font-mono">
                {Object.entries(variables).map(([name, val]) => (
                  <div
                    key={name}
                    className="flex justify-between items-center bg-muted/60 px-1.5 py-0.5 rounded text-[8px]"
                  >
                    <span>
                      {name} = {val}
                    </span>
                    {!isLocked && (
                      <button
                        onClick={() => handleRemoveVariable(name)}
                        className="text-destructive font-bold hover:scale-110"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Equation Inputs & List */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isLocked && (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputEq}
                onChange={(e) => setInputEq(e.target.value)}
                placeholder="Add equation... e.g. f(x) = 2 * sin(x)"
                className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                onKeyDown={(e) => e.key === "Enter" && handleAddEquation()}
              />
              <button
                onClick={handleAddEquation}
                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl active:scale-95 transition-all shadow-sm shadow-emerald-500/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
            {equations.map((eq, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-muted/50 border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-mono shadow-sm"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: lineColors[index % lineColors.length] }}
                />
                <span className="truncate max-w-[160px]">{eq}</span>
                <button
                  onClick={() => handleCopyLaTeX(eq)}
                  title="Copy LaTeX"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Clipboard className="h-2.5 w-2.5" />
                </button>
                {!isLocked && equations.length > 1 && (
                  <button
                    onClick={() => handleRemoveEquation(index)}
                    className="text-destructive hover:text-destructive/80 transition-colors font-bold ml-0.5"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recharts Plane Plotter */}
        <div className="flex-1 min-h-0 bg-muted/15 border border-border/30 rounded-xl relative p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={plotData}
              margin={{ top: 5, right: 5, bottom: 5, left: -25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[minX, maxX]}
                stroke="var(--muted-foreground)"
                style={{ fontSize: "8px", fontFamily: "monospace" }}
              />
              <YAxis
                type="number"
                domain={[minY, maxY]}
                stroke="var(--muted-foreground)"
                style={{ fontSize: "8px", fontFamily: "monospace" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  borderColor: "var(--border)",
                  fontSize: "9px",
                  fontFamily: "monospace",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
              />
              {equations.map((_, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={`y_${index}`}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
