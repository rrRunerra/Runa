"use client";

import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export interface RrBrowseHistoryProps {
  history: string[];
  onSelect: (hQuery: string) => void;
  onDelete: (hQuery: string) => void;
  onClear: () => void;
}

export const RrBrowseHistory = ({
  history,
  onSelect,
  onDelete,
  onClear,
}: RrBrowseHistoryProps): React.JSX.Element => {
  if (history.length === 0) return <></>;

  return (
    <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground/80 mt-0.5 px-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mr-1 select-none">
        Recent:
      </span>
      <div className="flex flex-wrap gap-1.5 items-center flex-1">
        <AnimatePresence mode="popLayout">
          {history.map((hQuery) => (
            <motion.div
              key={hQuery}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              layout
            >
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 flex items-center gap-1.5 py-0.5 h-6 rounded-md px-2 text-xs font-normal transition-colors border border-border/40 group/badge"
                onClick={() => onSelect(hQuery)}
              >
                <span>{hQuery}</span>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
                    e.stopPropagation();
                    onDelete(hQuery);
                  }}
                  className="text-muted-foreground/50 hover:text-foreground hover:bg-muted rounded-md p-0.5 transition-colors flex items-center justify-center ml-0.5 cursor-pointer size-4"
                  title="Remove search"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors ml-auto font-semibold py-1 px-2.5 hover:bg-destructive/10 rounded-md cursor-pointer"
        >
          Clear all
        </button>
      </div>
    </div>
  );
};
