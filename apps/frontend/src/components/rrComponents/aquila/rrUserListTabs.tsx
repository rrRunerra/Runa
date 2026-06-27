"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RrUserListTabsProps {
  lists: string[];
  activeList: string;
  setActiveList: (list: string) => void;
  counts: Record<string, number>;
  mediaType: string;
}

export function RrUserListTabs({
  lists,
  activeList,
  setActiveList,
  counts,
  mediaType,
}: RrUserListTabsProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3 overflow-x-auto no-scrollbar w-full">
      <div className="flex gap-2 flex-row flex-nowrap shrink-0">
        {lists.map((list) => {
          const isActive = activeList === list;
          const countKey = list.toLowerCase().replace(/\s+/g, "_");
          const count = counts?.[countKey] ?? 0;

          return (
            <button
              key={list}
              onClick={() => setActiveList(list)}
              className={cn(
                "relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none shrink-0",
                isActive
                  ? "text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`${mediaType}ActiveHorizontalListHighlight`}
                  className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              )}
              <span className="relative z-10">{list}</span>
              <span
                className={cn(
                  "relative z-10 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground transition-colors",
                  isActive &&
                    "bg-primary-foreground/20 text-primary-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
