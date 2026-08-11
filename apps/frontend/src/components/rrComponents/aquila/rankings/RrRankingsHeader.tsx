"use client";

import React from "react";
import Link from "next/link";
import {
  Trophy,
  Film,
  Book,
  Tv2,
  Tv,
  Gamepad2,
  BookA,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RrRankingsHeaderProps {
  currentType: string;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  totalCount?: number;
}

const CATEGORIES = [
  { id: "anime", labelKey: "sidebarAnime", icon: Film },
  { id: "manga", labelKey: "sidebarManga", icon: Book },
  { id: "movies", labelKey: "sidebarMovies", icon: Tv2 },
  { id: "tv", labelKey: "sidebarTvShows", icon: Tv },
  { id: "games", labelKey: "sidebarGames", icon: Gamepad2 },
  { id: "books", labelKey: "sidebarBooks", icon: BookA },
];

export const RrRankingsHeader: React.FC<RrRankingsHeaderProps> = ({
  currentType,
  viewMode,
  onViewModeChange,
  isFiltersOpen,
  onToggleFilters,
  activeFiltersCount,
  totalCount,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center size-12 rounded-2xl bg-linear-to-tr from-amber-500/20 via-primary/20 to-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <Trophy className="size-6 animate-pulse" />
            <Sparkles className="absolute -top-1 -right-1 size-3.5 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {t("aquila.rankings.title")}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {t("aquila.rankings.top100")}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {t("aquila.rankings.subtitle")}
            </p>
          </div>
        </div>

        {/* Controls: Filter Button + View Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Filters Toggle Button */}
          <Button
            variant={isFiltersOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-medium transition-all gap-1.5 shadow-xs cursor-pointer",
              isFiltersOpen
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : activeFiltersCount > 0
                  ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                  : "bg-card/60 text-muted-foreground hover:text-foreground border-border/60",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span
                className={cn(
                  "size-4 rounded-full text-[10px] font-bold flex items-center justify-center ml-0.5",
                  isFiltersOpen
                    ? "bg-primary-foreground text-primary"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/40 backdrop-blur-sm">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-medium transition-all gap-1.5",
                viewMode === "list"
                  ? "shadow-xs bg-background text-foreground hover:bg-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={t("aquila.rankings.listView")}
            >
              <LayoutList className="size-3.5" />
              <span className="hidden sm:inline">
                {t("aquila.rankings.listView")}
              </span>
            </Button>

            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "h-7 px-2.5 rounded-lg text-xs font-medium transition-all gap-1.5",
                viewMode === "grid"
                  ? "shadow-xs bg-background text-foreground hover:bg-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={t("aquila.rankings.gridView")}
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">
                {t("aquila.rankings.gridView")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive =
            currentType === cat.id ||
            (currentType === "movie" && cat.id === "movies") ||
            (currentType === "game" && cat.id === "games") ||
            (currentType === "book" && cat.id === "books");

          return (
            <Link
              key={cat.id}
              href={`/aquila/rankings/${cat.id}`}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card border-border/50",
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-transform group-hover:scale-110",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground",
                )}
              />
              <span>{t(cat.labelKey)}</span>
              {isActive && (
                <motion.div
                  layoutId="activeRankingTabIndicator"
                  className="absolute inset-0 rounded-xl bg-primary -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
