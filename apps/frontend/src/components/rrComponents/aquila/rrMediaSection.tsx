"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/types/aquila";
import { RrMediaCard } from "./rrMediaCard";

export interface RrMediaSectionProps {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  onIncrement: (item: MediaItem) => void;
  updatingId?: string | null;
  onRefresh: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function RrMediaSection({
  title,
  icon,
  items,
  onIncrement,
  updatingId = null,
  onRefresh,
  dragHandleProps,
}: RrMediaSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const localStorageKey = `aquila_collapsed_${title.toLowerCase()}`;
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(localStorageKey) === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem(localStorageKey, String(nextState));
  };

  const getMediaHref = (item: MediaItem) => {
    const mediaType = item.type;
    const subPath =
      mediaType === "manga"
        ? "manga"
        : mediaType === "tv"
          ? "tv"
          : mediaType === "movie"
            ? "movies"
            : mediaType === "game"
              ? "games"
              : mediaType === "book"
                ? "books"
                : "anime";
    return `/aquila/${subPath}/${item.id}`;
  };

  return (
    <section
      className="flex flex-col gap-6"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}
    >
      <div className="flex items-center gap-3 pb-3  group/header">
        <div
          {...(dragHandleProps || {})}
          className={cn(
            "p-2 bg-primary/10 rounded-lg text-primary select-none flex items-center gap-1",
            dragHandleProps &&
              "cursor-grab active:cursor-grabbing hover:bg-primary/20 active:bg-primary/30 transition-all duration-200 pointer-events-auto",
          )}
          title={dragHandleProps ? t("aquila.dragToReorder") : undefined}
        >
          {dragHandleProps && (
            <GripVertical className="size-4 opacity-50 group-hover/header:opacity-100 transition-opacity duration-200" />
          )}
          {icon}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        <button onClick={toggleCollapse} className="cursor-pointer select-none">
          <Badge
            variant={isCollapsed ? "outline" : "secondary"}
            className={cn(
              "ml-2 transition-all duration-300 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold py-0.5 px-2.5 rounded-full select-none cursor-pointer border",
              isCollapsed
                ? "bg-destructive/10 hover:bg-destructive/25 text-destructive border-destructive/20 shadow-xs"
                : "bg-primary/5 hover:bg-primary/15 text-primary border-primary/10 shadow-inner",
            )}
          >
            {isCollapsed ? (
              <>
                <EyeOff className="size-3.5 animate-pulse" />
                <span>{t("aquila.hiddenCount", { count: items.length })}</span>
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                <span>{t("aquila.itemsCount", { count: items.length })}</span>
              </>
            )}
          </Badge>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4 pb-2">
              {items.map((item: MediaItem) => (
                <RrMediaCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  href={getMediaHref(item)}
                  isOwner={true}
                  onIncrement={() => onIncrement(item)}
                  isUpdating={updatingId === `${item.type}-${item.id}`}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
