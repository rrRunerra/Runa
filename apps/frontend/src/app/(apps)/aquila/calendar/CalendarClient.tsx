"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Tv,
  BookOpen,
  Gamepad2,
  Film,
  Play,
  Loader2,
  Bookmark,
  LayoutGrid,
  List,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import RrLapplandBrowse from "@/components/rrComponents/rrImages/rrLapplandBrowse";
import { useTranslation } from "react-i18next";

interface CalendarItem {
  id: string | number;
  title: string;
  coverImage: string | null;
  type: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  airDate: string; // YYYY-MM-DD
  airingAt?: number; // Unix timestamp
  season?: number;
  episode?: number;
  episodeTitle?: string;
  event: "airing" | "release" | "premiere";
}

type MediaTypeFilter = "all" | CalendarItem["type"];
type DensityMode = "compact" | "detailed";

const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getWeekDays = (focusDate: Date): Date[] => {
  const monday = getMondayOfWeek(focusDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const getMonthGridDays = (focusDate: Date): Date[] => {
  const startOfMonth = new Date(
    focusDate.getFullYear(),
    focusDate.getMonth(),
    1,
  );
  const startDay = startOfMonth.getDay();
  const startDiff = startDay === 0 ? -6 : 1 - startDay;
  const gridStart = new Date(startOfMonth);
  gridStart.setDate(startOfMonth.getDate() + startDiff);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
};

const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CalendarClientPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const [focusDate, setFocusDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [densityMode, setDensityMode] = useState<DensityMode>("detailed");
  const [selectedMediaType, setSelectedMediaType] =
    useState<MediaTypeFilter>("all");
  const [watchlistOnly, setWatchlistOnly] = useState<boolean>(false);

  const MEDIA_CONFIG: Record<
    CalendarItem["type"],
    {
      label: string;
      icon: React.JSX.Element;
      color: string;
      bg: string;
      border: string;
      detailUrl: (id: string | number) => string;
    }
  > = useMemo(
    () => ({
      anime: {
        label: t("aquila.anime"),
        icon: <Play className="size-3" />,
        color: "text-red-500",
        bg: "bg-red-500/10 hover:bg-red-500/15",
        border: "border-red-500/20 hover:border-red-500/35",
        detailUrl: (id) => `/aquila/anime/${id}`,
      },
      manga: {
        label: t("aquila.manga"),
        icon: <BookOpen className="size-3" />,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
        border: "border-emerald-500/20 hover:border-emerald-500/35",
        detailUrl: (id) => `/aquila/manga/${id}`,
      },
      tv: {
        label: t("aquila.tv"),
        icon: <Tv className="size-3" />,
        color: "text-violet-500",
        bg: "bg-violet-500/10 hover:bg-violet-500/15",
        border: "border-violet-500/20 hover:border-violet-500/35",
        detailUrl: (id) => `/aquila/tv/${id}`,
      },
      movie: {
        label: t("aquila.movie"),
        icon: <Film className="size-3" />,
        color: "text-amber-500",
        bg: "bg-amber-500/10 hover:bg-amber-500/15",
        border: "border-amber-500/20 hover:border-amber-500/35",
        detailUrl: (id) => `/aquila/movies/${id}`,
      },
      game: {
        label: t("aquila.game"),
        icon: <Gamepad2 className="size-3" />,
        color: "text-cyan-500",
        bg: "bg-cyan-500/10 hover:bg-cyan-500/15",
        border: "border-cyan-500/20 hover:border-cyan-500/35",
        detailUrl: (id) => `/aquila/games/${id}`,
      },
      book: {
        label: t("aquila.book"),
        icon: <BookOpen className="size-3" />,
        color: "text-sky-500",
        bg: "bg-sky-500/10 hover:bg-sky-500/15",
        border: "border-sky-500/20 hover:border-sky-500/35",
        detailUrl: (id) => `/aquila/books/${id}`,
      },
    }),
    [t],
  );

  const DAY_NAMES = useMemo(
    () => [
      t("aquila.mon"),
      t("aquila.tue"),
      t("aquila.wed"),
      t("aquila.thu"),
      t("aquila.fri"),
      t("aquila.sat"),
      t("aquila.sun"),
    ],
    [t],
  );

  // Compute active date ranges to fetch
  const dateRange = useMemo(() => {
    if (viewMode === "week") {
      const days = getWeekDays(focusDate);
      return { start: days[0], end: days[6] };
    } else {
      const days = getMonthGridDays(focusDate);
      return { start: days[0], end: days[41] };
    }
  }, [focusDate, viewMode]);

  const startDateStr = formatDateStr(dateRange.start);
  const endDateStr = formatDateStr(dateRange.end);

  const calendarUrl = `${process.env.NEXT_PUBLIC_API_URL}/discover/calendar?start=${startDateStr}&end=${endDateStr}${watchlistOnly ? "&watchlist=true" : ""}`;

  // Fetch calendar events
  const { data: events = [], isLoading } = useSWR<CalendarItem[]>(
    status !== "loading" ? [calendarUrl, session?.accessToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // Compute total counts per media type across the loaded date range
  const mediaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: events.length,
      anime: 0,
      manga: 0,
      tv: 0,
      movie: 0,
      game: 0,
      book: 0,
    };
    for (const item of events) {
      if (counts[item.type] !== undefined) {
        counts[item.type] += 1;
      }
    }
    return counts;
  }, [events]);

  // Filter events by selected media type
  const filteredEvents = useMemo(() => {
    if (selectedMediaType === "all") return events;
    return events.filter((e) => e.type === selectedMediaType);
  }, [events, selectedMediaType]);

  // Group filtered events by local date string
  const groupedEvents = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const event of filteredEvents) {
      let dateKey = event.airDate;
      if (event.airingAt) {
        dateKey = formatDateStr(new Date(event.airingAt * 1000));
      }
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    }
    return map;
  }, [filteredEvents]);

  const handlePrev = () => {
    setFocusDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "week") {
        d.setDate(prev.getDate() - 7);
      } else {
        d.setMonth(prev.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setFocusDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "week") {
        d.setDate(prev.getDate() + 7);
      } else {
        d.setMonth(prev.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setFocusDate(new Date());
  };

  const headerTitle = useMemo(() => {
    if (viewMode === "week") {
      const weekDays = getWeekDays(focusDate);
      const startFmt = weekDays[0].toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endFmt = weekDays[6].toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startFmt} — ${endFmt}`;
    } else {
      return focusDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  }, [focusDate, viewMode]);

  const daysToShow = useMemo(() => {
    return viewMode === "week"
      ? getWeekDays(focusDate)
      : getMonthGridDays(focusDate);
  }, [focusDate, viewMode]);

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const FILTER_TABS: Array<{
    id: MediaTypeFilter;
    label: string;
    icon?: React.JSX.Element;
  }> = [
    {
      id: "all",
      label: t("aquila.all"),
      icon: <Layers className="size-3.5" />,
    },
    {
      id: "anime",
      label: t("aquila.anime"),
      icon: <Play className="size-3.5" />,
    },
    {
      id: "manga",
      label: t("aquila.manga"),
      icon: <BookOpen className="size-3.5" />,
    },
    { id: "tv", label: t("aquila.tv"), icon: <Tv className="size-3.5" /> },
    {
      id: "movie",
      label: t("aquila.movie"),
      icon: <Film className="size-3.5" />,
    },
    {
      id: "game",
      label: t("aquila.game"),
      icon: <Gamepad2 className="size-3.5" />,
    },
    {
      id: "book",
      label: t("aquila.book"),
      icon: <BookOpen className="size-3.5" />,
    },
  ];

  return (
    <div className="relative w-full min-h-full flex flex-col flex-1 p-4 md:p-8">
      {/* Background Wallpaper */}
      <RrLapplandBrowse className="fixed right-0 top-0 h-screen w-auto opacity-[0.05] text-foreground pointer-events-none select-none z-0 object-contain -scale-x-100 transition-opacity duration-300" />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col gap-5 w-full">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 bg-card/40 border border-border/40 backdrop-blur-md p-4 rounded-3xl shadow-xs">
          {/* Title & Info */}
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary shadow-xs shrink-0">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {t("aquila.airingCalendar")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("aquila.calendarSubtitle")}
              </p>
            </div>
          </div>

          {/* Date & Nav controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={handlePrev}
              className="size-9 rounded-xl border border-border/60 hover:bg-accent/40 cursor-pointer shrink-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleToday}
              className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-border/60 hover:bg-accent/40 cursor-pointer shrink-0"
            >
              {t("aquila.today")}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleNext}
              className="size-9 rounded-xl border border-border/60 hover:bg-accent/40 cursor-pointer shrink-0"
            >
              <ChevronRight className="size-4" />
            </Button>
            <span className="text-sm font-semibold tracking-wide px-3 select-none text-foreground text-center min-w-40">
              {headerTitle}
            </span>
          </div>

          {/* View Toggles & Watchlist Switch */}
          <div className="flex items-center justify-end gap-3 flex-wrap">
            {/* Density Toggle */}
            <div className="bg-muted/40 border border-border/40 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
              <Button
                variant={densityMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDensityMode("compact")}
                title={t("aquila.compact")}
                className={cn(
                  "h-7 px-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5",
                  densityMode === "compact" &&
                    "bg-card shadow-xs border border-border/10 text-foreground",
                )}
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline text-[11px]">
                  {t("aquila.compact")}
                </span>
              </Button>
              <Button
                variant={densityMode === "detailed" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDensityMode("detailed")}
                title={t("aquila.detailed")}
                className={cn(
                  "h-7 px-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5",
                  densityMode === "detailed" &&
                    "bg-card shadow-xs border border-border/10 text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline text-[11px]">
                  {t("aquila.detailed")}
                </span>
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="bg-muted/40 border border-border/40 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={cn(
                  "h-7 px-3 text-xs font-bold rounded-xl cursor-pointer transition-all",
                  viewMode === "week" &&
                    "bg-card shadow-xs border border-border/10 text-foreground",
                )}
              >
                {t("aquila.week")}
              </Button>
              <Button
                variant={viewMode === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={cn(
                  "h-7 px-3 text-xs font-bold rounded-xl cursor-pointer transition-all",
                  viewMode === "month" &&
                    "bg-card shadow-xs border border-border/10 text-foreground",
                )}
              >
                {t("aquila.month")}
              </Button>
            </div>

            {/* Watchlist Filter Switch */}
            {status === "authenticated" && (
              <div className="flex items-center gap-2 border-l border-border/60 pl-3 h-8">
                <Switch
                  id="watchlist-only"
                  checked={watchlistOnly}
                  onCheckedChange={setWatchlistOnly}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="watchlist-only"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none cursor-pointer flex items-center gap-1"
                >
                  <Bookmark
                    className={cn(
                      "size-3.5",
                      watchlistOnly
                        ? "fill-primary text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="hidden sm:inline">
                    {t("aquila.watchlist")}
                  </span>
                </Label>
              </div>
            )}
          </div>
        </div>

        {/* Media Type Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          {FILTER_TABS.map((tab) => {
            const isSelected = selectedMediaType === tab.id;
            const count = mediaCounts[tab.id] || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedMediaType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border shrink-0",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                    : "bg-card/40 hover:bg-accent/40 border-border/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loader Screen / Content Area */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-[50vh] flex flex-col items-center justify-center gap-3"
            >
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("aquila.loadingReleases")}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1"
            >
              {viewMode === "week" ? (
                /* WEEKLY VIEW LAYOUT */
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5 items-start min-h-[50vh]">
                  {daysToShow.map((day, idx) => {
                    const dateKey = formatDateStr(day);
                    const dayEvents = groupedEvents[dateKey] || [];
                    const activeToday = isToday(day);

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex flex-col bg-card/30 border border-border/40 backdrop-blur-xs rounded-3xl p-3.5 transition-all duration-300 hover:shadow-md h-full",
                          activeToday &&
                            "bg-primary/5 border-primary/25 ring-1 ring-primary/10 shadow-lg shadow-primary/5",
                        )}
                      >
                        {/* Sticky Day Header */}
                        <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-md pb-2.5 mb-2.5 border-b border-border/30 flex items-center justify-between">
                          <div>
                            <p
                              className={cn(
                                "text-xs font-bold uppercase tracking-wider text-muted-foreground",
                                activeToday && "text-primary font-black",
                              )}
                            >
                              {DAY_NAMES[idx]}
                            </p>
                            <div className="flex items-baseline gap-2">
                              <p className="text-lg font-black tracking-tight text-foreground">
                                {day.getDate()}
                              </p>
                              {dayEvents.length > 0 && (
                                <span className="text-[10px] font-bold text-muted-foreground opacity-80">
                                  ({dayEvents.length})
                                </span>
                              )}
                            </div>
                          </div>
                          {activeToday && (
                            <Badge className="bg-primary/20 text-primary border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none px-1.5 py-0.5">
                              {t("aquila.todayBadge")}
                            </Badge>
                          )}
                        </div>

                        {/* Scrollable Day Events List */}
                        <div className="flex flex-col gap-2 flex-1 max-h-145 overflow-y-auto pr-1 custom-scrollbar">
                          {dayEvents.length === 0 ? (
                            <div className="flex-1 min-h-24 flex items-center justify-center text-center p-3 opacity-25">
                              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground select-none">
                                {t("aquila.noReleases")}
                              </p>
                            </div>
                          ) : (
                            dayEvents.map((event) =>
                              densityMode === "detailed" ? (
                                <CalendarEventCard
                                  key={`${event.type}-${event.id}-${event.event}-${event.episode || event.airingAt || "0"}`}
                                  event={event}
                                  mediaConfig={MEDIA_CONFIG}
                                />
                              ) : (
                                <CalendarEventChip
                                  key={`${event.type}-${event.id}-${event.event}-${event.episode || event.airingAt || "0"}`}
                                  event={event}
                                  mediaConfig={MEDIA_CONFIG}
                                />
                              ),
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* MONTHLY GRID LAYOUT */
                <div className="flex flex-col bg-card/25 border border-border/35 backdrop-blur-md rounded-3xl overflow-hidden shadow-xs">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 border-b border-border/30 bg-muted/20 text-center py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {DAY_NAMES.map((name) => (
                      <div key={name}>{name}</div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 grid-rows-6 divide-x divide-y divide-border/30 border-t border-l border-transparent">
                    {daysToShow.map((day, idx) => {
                      const dateKey = formatDateStr(day);
                      const dayEvents = groupedEvents[dateKey] || [];
                      const activeToday = isToday(day);
                      const isCurrentMonth =
                        day.getMonth() === focusDate.getMonth();

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "min-h-28 p-2 flex flex-col gap-1 transition-all",
                            !isCurrentMonth && "bg-muted/10 opacity-35",
                            activeToday &&
                              "bg-primary/5 ring-1 ring-inset ring-primary/20",
                          )}
                        >
                          {/* Date label */}
                          <div className="flex items-center justify-between text-[11px] font-black select-none px-1">
                            <span
                              className={cn(
                                "text-muted-foreground",
                                isCurrentMonth && "text-foreground",
                                activeToday &&
                                  "text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center font-black",
                              )}
                            >
                              {day.getDate()}
                            </span>
                            {activeToday && !isToday(focusDate) && (
                              <span className="text-[9px] font-bold text-primary uppercase">
                                {t("aquila.todayBadge")}
                              </span>
                            )}
                          </div>

                          {/* Event Tags */}
                          <div className="flex flex-col gap-1 overflow-y-auto max-h-24 custom-scrollbar mt-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <CalendarEventTag
                                key={`${event.type}-${event.id}-${event.event}-${event.episode || event.airingAt || "0"}`}
                                event={event}
                                mediaConfig={MEDIA_CONFIG}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <HoverCard openDelay={200} closeDelay={100}>
                                <HoverCardTrigger asChild>
                                  <button className="text-[10px] text-left px-1.5 py-0.5 rounded bg-muted/65 hover:bg-muted/80 text-muted-foreground font-bold uppercase cursor-pointer">
                                    {t("aquila.moreCount", {
                                      count: dayEvents.length - 3,
                                    })}
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent
                                  side="top"
                                  className="p-3 w-64 bg-card/95 border border-border/50 backdrop-blur-md rounded-2xl shadow-xl flex flex-col gap-2"
                                >
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-1.5">
                                    {t("aquila.releasesOnDate", {
                                      date: day.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      }),
                                    })}
                                  </p>
                                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {dayEvents.map((event) => (
                                      <CalendarEventCard
                                        key={`${event.type}-${event.id}-${event.event}-${event.episode || event.airingAt || "0"}`}
                                        event={event}
                                        mediaConfig={MEDIA_CONFIG}
                                        compact
                                      />
                                    ))}
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const getFormattedTime = (airingAt?: number): string | null => {
  if (!airingAt) return null;
  const date = new Date(airingAt * 1000);
  const h = date.getHours();
  const m = date.getMinutes();
  if (h === 0 && m === 0) return null;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const getFormattedDate = (airDate: string, airingAt?: number): string => {
  if (airingAt) {
    const d = new Date(airingAt * 1000);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  const parts = airDate.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return airDate;
};

// Hover preview helper containing description, rating, status summaries
interface PreviewProps {
  event: CalendarItem;
  children: React.ReactNode;
  mediaConfig: any;
  compact?: boolean;
}

function CalendarEventPreview({
  event,
  children,
  mediaConfig,
}: PreviewProps): React.JSX.Element {
  const { t } = useTranslation();
  const config = mediaConfig[event.type];
  const [hoverData, setHoverData] = useState<any>(null);

  const handleOpenChange = async (open: boolean) => {
    if (open && !hoverData) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/${event.type}/${event.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setHoverData(data);
        }
      } catch (err) {
        console.error("Failed to load hover preview", err);
      }
    }
  };

  const getEventName = (evType: string) => {
    if (evType === "airing") return t("aquila.episodeAiring");
    if (evType === "premiere") return t("aquila.premiere");
    return t("aquila.release");
  };

  const releaseTimeStr = getFormattedTime(event.airingAt);
  const releaseDateStr = getFormattedDate(event.airDate, event.airingAt);

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        className="w-76 p-0 overflow-hidden bg-card/95 border border-border/50 backdrop-blur-md rounded-3xl shadow-2xl flex flex-col"
      >
        <div className="relative h-28 w-full bg-muted flex items-center justify-center overflow-hidden">
          {event.coverImage ? (
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover brightness-65 blur-xs scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-accent/20" />
          )}

          {/* Quick info over backdrop */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-background/90 to-transparent flex gap-3 items-end z-10">
            <div className="relative w-11 aspect-2/3 shrink-0 rounded-lg overflow-hidden border border-border/20 shadow-md">
              {event.coverImage && (
                <Image
                  src={event.coverImage}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h5
                className="font-extrabold text-[12px] text-foreground line-clamp-1 leading-tight mb-0.5"
                title={event.title}
              >
                {event.title}
              </h5>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  className={cn(
                    "rounded px-1 text-[8px] font-extrabold uppercase shadow-none border-transparent",
                    config.bg,
                    config.color,
                  )}
                >
                  {config.label}
                </Badge>
                {event.episode && (
                  <Badge className="bg-primary/20 text-primary border-transparent rounded px-1 text-[8px] font-extrabold shadow-none">
                    {event.season
                      ? `S${event.season} ${t("aquila.episodeShort")} ${event.episode}`
                      : `${t("aquila.episodeShort")} ${event.episode}`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details section */}
        <div className="p-3.5 space-y-3">
          {/* Episode Title if available */}
          {event.episodeTitle && (
            <div className="bg-primary/5 border border-primary/15 px-2.5 py-1.5 rounded-xl">
              <span className="text-[8px] uppercase font-extrabold tracking-wider text-primary block">
                {t("aquila.episodeTitle")}
              </span>
              <span className="text-[11px] font-bold text-foreground line-clamp-1">
                {event.episodeTitle}
              </span>
            </div>
          )}

          {/* Description summary */}
          <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
            {hoverData?.description
              ? hoverData.description.replace(/<[^>]*>/g, "")
              : t("aquila.loadingDescription")}
          </p>

          {/* Release Date & Time box */}
          <div className="bg-muted/30 border border-border/30 p-2 rounded-2xl flex items-center justify-between text-[10px]">
            <div>
              <span className="text-muted-foreground block text-[8px] uppercase tracking-wider font-bold">
                {t("aquila.releaseDate")}
              </span>
              <span className="font-extrabold text-foreground">
                {releaseDateStr}
              </span>
            </div>
            {releaseTimeStr && (
              <div className="text-right">
                <span className="text-muted-foreground block text-[8px] uppercase tracking-wider font-bold">
                  {t("aquila.releaseTime")}
                </span>
                <span className="font-extrabold text-primary">
                  {releaseTimeStr}
                </span>
              </div>
            )}
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-border/30 pt-2.5">
            <div>
              <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">
                {t("aquila.status")}
              </span>
              <span className="font-semibold text-foreground truncate block uppercase">
                {hoverData?.status || t("aquila.unknown")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[9px] uppercase tracking-wider font-bold">
                {t("aquila.eventType")}
              </span>
              <span className="font-semibold text-foreground capitalize block">
                {getEventName(event.event)}
              </span>
            </div>
          </div>

          {/* Action button */}
          <Button
            size="sm"
            className="w-full rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
            asChild
          >
            <Link href={config.detailUrl(event.id)}>
              {t("aquila.goToMediaPage")}
            </Link>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Calendar Event Card component for Detailed Mode in Weekly View
function CalendarEventCard({
  event,
  mediaConfig,
  compact = false,
}: {
  event: CalendarItem;
  mediaConfig: any;
  compact?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const config = mediaConfig[event.type];
  const releaseTimeStr = getFormattedTime(event.airingAt);

  const getEventTagLabel = () => {
    if (event.event === "airing") {
      if (event.season) return `S${event.season} Ep ${event.episode}`;
      return `${t("aquila.episodeShort")} ${event.episode}`;
    }
    if (event.event === "premiere") return t("aquila.premiere");
    return t("aquila.release");
  };

  return (
    <CalendarEventPreview
      event={event}
      mediaConfig={mediaConfig}
      compact={compact}
    >
      <Link
        href={config.detailUrl(event.id)}
        className={cn(
          "group relative flex items-center gap-2.5 p-2 rounded-2xl border bg-card/60 backdrop-blur-2xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xs cursor-pointer min-w-0 w-full shrink-0",
          config.bg,
          config.border,
        )}
      >
        <div className="relative w-8 h-12 shrink-0 rounded-lg overflow-hidden bg-muted/30">
          {event.coverImage && (
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span
            className="font-bold text-[10px] text-foreground group-hover:text-primary leading-tight line-clamp-1 mb-0.5"
            title={event.title}
          >
            {event.title}
          </span>
          {event.episodeTitle && (
            <span className="text-[9px] text-muted-foreground line-clamp-1 leading-none mb-1 font-medium">
              {event.episodeTitle}
            </span>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                event.type === "anime"
                  ? "bg-red-500"
                  : event.type === "manga"
                    ? "bg-emerald-500"
                    : event.type === "tv"
                      ? "bg-violet-500"
                      : event.type === "movie"
                        ? "bg-amber-500"
                        : event.type === "game"
                          ? "bg-cyan-500"
                          : "bg-sky-500",
              )}
            />
            <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground truncate">
              {getEventTagLabel()}
            </span>
            {releaseTimeStr && (
              <span className="text-[8px] font-extrabold text-primary bg-primary/10 px-1 py-0.2 rounded-xs ml-auto">
                {releaseTimeStr}
              </span>
            )}
          </div>
        </div>
      </Link>
    </CalendarEventPreview>
  );
}

// Calendar Event Chip component for Compact Mode in Weekly View
function CalendarEventChip({
  event,
  mediaConfig,
}: {
  event: CalendarItem;
  mediaConfig: any;
}): React.JSX.Element {
  const { t } = useTranslation();
  const config = mediaConfig[event.type];
  const releaseTimeStr = getFormattedTime(event.airingAt);

  return (
    <CalendarEventPreview event={event} mediaConfig={mediaConfig}>
      <Link
        href={config.detailUrl(event.id)}
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 rounded-xl border backdrop-blur-2xs transition-all cursor-pointer min-w-0 w-full shrink-0",
          config.bg,
          config.border,
        )}
      >
        <span className={cn("shrink-0", config.color)}>{config.icon}</span>

        <span className="text-[10px] font-bold text-foreground group-hover:text-primary leading-tight truncate flex-1 select-none">
          {event.event === "airing" && event.episode
            ? event.season
              ? `S${event.season}E${event.episode} `
              : `${t("aquila.episodeShortAbbr")}${event.episode} `
            : ""}
          {event.title}
        </span>

        {releaseTimeStr && (
          <span className="text-[8px] font-extrabold text-primary bg-primary/10 px-1 py-0.2 rounded-xs shrink-0 ml-auto">
            {releaseTimeStr}
          </span>
        )}
      </Link>
    </CalendarEventPreview>
  );
}

// Calendar Event Tag component for Monthly cells
function CalendarEventTag({
  event,
  mediaConfig,
}: {
  event: CalendarItem;
  mediaConfig: any;
}): React.JSX.Element {
  const { t } = useTranslation();
  const config = mediaConfig[event.type];
  const releaseTimeStr = getFormattedTime(event.airingAt);

  return (
    <CalendarEventPreview event={event} mediaConfig={mediaConfig}>
      <Link
        href={config.detailUrl(event.id)}
        className={cn(
          "group flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border backdrop-blur-3xs transition-all cursor-pointer min-w-0 w-full truncate",
          config.bg,
          config.border,
        )}
      >
        <span className={cn("shrink-0", config.color)}>{config.icon}</span>
        <span className="text-[9px] font-bold text-foreground group-hover:text-primary leading-none truncate flex-1 select-none flex items-center justify-between gap-1">
          <span className="truncate">
            {event.event === "airing"
              ? event.season
                ? `S${event.season}E${event.episode} `
                : `${t("aquila.episodeShortAbbr")}${event.episode} `
              : ""}
            {event.title}
          </span>
          {releaseTimeStr && (
            <span className="text-[7.5px] font-extrabold text-muted-foreground shrink-0 opacity-80">
              {releaseTimeStr}
            </span>
          )}
        </span>
      </Link>
    </CalendarEventPreview>
  );
}
