"use client";

import React from "react";
import { CanvasNode } from "../CanvasEditor";

interface RrCanvasTableCardProps {
  node: CanvasNode;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasTableCard({ node, isLocked = false, onNodeUpdate }: RrCanvasTableCardProps) {
  const currentTable = node.tableData || [["", ""]];

  const handleAddRow = () => {
    const cols = currentTable[0]?.length || 2;
    onNodeUpdate({
      tableData: [...currentTable, Array(cols).fill("")],
    });
  };

  const handleAddCol = () => {
    onNodeUpdate({
      tableData: currentTable.map((row) => [...row, ""]),
    });
  };

  const handleRemoveRow = () => {
    if (currentTable.length <= 1) return;
    onNodeUpdate({
      tableData: currentTable.slice(0, -1),
    });
  };

  const handleRemoveCol = () => {
    if ((currentTable[0]?.length || 0) <= 1) return;
    onNodeUpdate({
      tableData: currentTable.map((row) => row.slice(0, -1)),
    });
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const nextTable = currentTable.map((r, ri) =>
      r.map((c, ci) => (ri === rIdx && ci === cIdx ? val : c))
    );
    onNodeUpdate({
      tableData: nextTable,
    });
  };

  return (
    <div
      className="relative w-full h-full flex flex-col p-3 text-foreground bg-card/65 overflow-hidden"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5 shrink-0">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          Spreadsheet Grid
        </span>
        {!isLocked && (
          <div className="flex gap-1.5">
            <button
              onClick={handleAddRow}
              className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-primary transition-all active:scale-95"
            >
              + Row
            </button>
            <button
              onClick={handleAddCol}
              className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-success transition-all active:scale-95"
            >
              + Col
            </button>
            <button
              onClick={handleRemoveRow}
              className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-destructive transition-all active:scale-95"
            >
              - Row
            </button>
            <button
              onClick={handleRemoveCol}
              className="px-1.5 py-0.5 bg-muted hover:bg-muted/80 rounded text-[8px] font-bold text-warning transition-all active:scale-95"
            >
              - Col
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse border border-border text-[10px]">
          <tbody>
            {currentTable.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="border-r border-border p-0.5">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                      readOnly={isLocked}
                      className="w-full bg-transparent border-0 px-1 py-0.5 text-[9px] text-foreground focus:outline-none focus:bg-muted font-medium disabled:opacity-70"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
