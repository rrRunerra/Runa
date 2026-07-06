"use client";

import React from "react";
import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import TiptapNode from "../TiptapNode";
import { CanvasNode } from "../CanvasEditor";
import { cn } from "@/lib/utils";

interface RrCanvasCalloutCardProps {
  node: CanvasNode;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasCalloutCard({ node, onNodeUpdate }: RrCanvasCalloutCardProps) {
  const type = node.calloutType || "info";

  const config = {
    info: {
      border: "border-l-[6px] border-l-blue-500 border-blue-500/20",
      bg: "bg-blue-500/[0.04]",
      icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
      title: "Information",
    },
    warning: {
      border: "border-l-[6px] border-l-amber-500 border-amber-500/20",
      bg: "bg-amber-500/[0.04]",
      icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
      title: "Warning",
    },
    success: {
      border: "border-l-[6px] border-l-emerald-500 border-emerald-500/20",
      bg: "bg-emerald-500/[0.04]",
      icon: <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />,
      title: "Success",
    },
    error: {
      border: "border-l-[6px] border-l-rose-500 border-rose-500/20",
      bg: "bg-rose-500/[0.04]",
      icon: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
      title: "Danger",
    },
  }[type] || {
    border: "border-l-[6px] border-l-blue-500 border-blue-500/20",
    bg: "bg-blue-500/[0.04]",
    icon: <Info className="h-4 w-4 text-blue-500 shrink-0" />,
    title: "Information",
  };

  return (
    <div
      className={cn(
        "relative w-full h-full flex flex-col p-3 border rounded-r-xl overflow-hidden shadow-sm transition-colors",
        config.border,
        config.bg
      )}
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-border/20 shrink-0 select-none">
        {config.icon}
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-foreground">
          {config.title}
        </span>
      </div>
      <div className="flex-1 w-full min-h-0 overflow-hidden">
        <TiptapNode
          content={node.text || ""}
          onChange={(html) => onNodeUpdate({ text: html })}
        />
      </div>
    </div>
  );
}
