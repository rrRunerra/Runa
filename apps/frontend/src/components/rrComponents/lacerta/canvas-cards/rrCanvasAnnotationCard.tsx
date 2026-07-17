"use client";

import React from "react";
import { MessageSquare } from "lucide-react";
import TiptapNode from "../TiptapNode";
import { CanvasNode } from "../types";
import { useTranslation } from "react-i18next";

interface RrCanvasAnnotationCardProps {
  node: CanvasNode;
  isLocked?: boolean;
  onNodeUpdate: (updates: Partial<CanvasNode>) => void;
}

export default function RrCanvasAnnotationCard({ node, isLocked = false, onNodeUpdate }: RrCanvasAnnotationCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      className="relative w-full h-full flex flex-col p-3 border border-indigo-500/25 bg-card rounded-2xl shadow-xl hover:border-indigo-500/45 transition-colors"
      onMouseDown={(e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
      }}
    >
      <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-primary/10 shrink-0 select-none">
        <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
          {t("lacerta.canvasEditor.annotationTitle", "Annotation")}
        </span>
      </div>
      <div className="flex-1 w-full min-h-0 overflow-hidden">
        <TiptapNode
          content={node.text || ""}
          onChange={(html) => onNodeUpdate({ text: html })}
          editable={!isLocked}
        />
      </div>
    </div>
  );
}
