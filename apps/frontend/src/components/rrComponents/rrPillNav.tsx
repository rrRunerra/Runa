"use client";

import type React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RrPillNavItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ElementType;
  badge?: React.ReactNode;
}

export interface RrPillNavProps<T extends string = string> {
  items: RrPillNavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  layoutId?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function RrPillNav<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
  layoutId = "activeCategoryHighlight",
  size = "md",
  fullWidth = false,
}: RrPillNavProps<T>): React.JSX.Element {
  return (
    <div
      className={cn(
        "overflow-x-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-full",
        fullWidth ? "w-full" : "w-fit",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-row flex-nowrap shrink-0 gap-1 p-1 bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl shadow-sm",
          fullWidth ? "w-full min-w-full" : "w-max",
        )}
      >
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "relative rounded-xl text-xs font-semibold transition-all duration-200 select-none cursor-pointer shrink-0 whitespace-nowrap text-center outline-hidden flex items-center justify-center gap-1.5",
                fullWidth ? "flex-1" : "flex-none",
                size === "sm"
                  ? "px-3 py-1.5 text-xs"
                  : size === "lg"
                    ? "px-4 py-2.5 text-sm font-bold"
                    : "px-3.5 py-2 text-xs",
                isActive
                  ? "text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 bg-primary text-primary-foreground rounded-xl shadow-md shadow-primary/20"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 26,
                  }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
                {Icon && <Icon className="size-3.5" />}
                {item.label}
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
