"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  getHolidaysForDate,
  getJapaneseEraString,
  getLunarDateString,
} from "@/lib/calendarHelpers";
import type { CalendarEvent } from "@/hooks/usePolarisCalendar";
import { MapPin, Clock } from "lucide-react";

interface RrCalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedHolidayCountry: string;
  showJapaneseEra: boolean;
  showLunarCalendar: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
}

export function RrCalendarMonthView({
  currentDate,
  events,
  selectedHolidayCountry,
  showJapaneseEra,
  showLunarCalendar,
  onSelectEvent,
  onSelectDate,
}: RrCalendarMonthViewProps) {
  const { t } = useTranslation();

  const daysOfWeek = [
    t("polaris.calendar.sun"),
    t("polaris.calendar.mon"),
    t("polaris.calendar.tue"),
    t("polaris.calendar.wed"),
    t("polaris.calendar.thu"),
    t("polaris.calendar.fri"),
    t("polaris.calendar.sat"),
  ];

  // Calculate 35-42 calendar grid cells
  const gridCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const cells: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toDateString();

    // Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === todayStr,
      });
    }

    // Next month padding days to complete 35 or 42 grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
      });
    }

    return cells;
  }, [currentDate]);

  // Index events by date string "YYYY-MM-DD"
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const d = new Date(event.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col h-full bg-background select-none">
      {/* Header Row Days of Week */}
      <div className="grid grid-cols-7 border-b border-border bg-card/40 text-center py-2 text-xs font-semibold text-muted-foreground">
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="tracking-wider uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-px bg-border/60 p-px">
        {gridCells.map((cell, idx) => {
          const cellStart = new Date(
            cell.date.getFullYear(),
            cell.date.getMonth(),
            cell.date.getDate(),
            0,
            0,
            0,
            0,
          );
          const cellEnd = new Date(
            cell.date.getFullYear(),
            cell.date.getMonth(),
            cell.date.getDate(),
            23,
            59,
            59,
            999,
          );

          const dayEvents = events.filter((e) => {
            const eStart = new Date(e.start);
            const eEnd = new Date(e.end);
            return eStart <= cellEnd && eEnd >= cellStart;
          });
          const holidays = getHolidaysForDate(
            cell.date,
            selectedHolidayCountry,
          );

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(cell.date)}
              className={`flex flex-col min-h-27.5 md:min-h-33.75 p-2 bg-card hover:bg-accent/40 transition-colors cursor-pointer group relative ${
                !cell.isCurrentMonth ? "opacity-40 bg-background/50" : ""
              }`}
            >
              {/* Date Header Number & Subtitles */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`size-7 flex items-center justify-center text-xs font-bold rounded-full ${
                    cell.isToday
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {cell.date.getDate()}
                </span>

                <div className="flex flex-col items-end text-[10px] text-muted-foreground">
                  {showJapaneseEra && (
                    <span>{getJapaneseEraString(cell.date)}</span>
                  )}
                  {showLunarCalendar && (
                    <span>{getLunarDateString(cell.date)}</span>
                  )}
                </div>
              </div>

              {/* Holiday Badges */}
              {holidays.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {holidays.map((h, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-destructive/15 text-destructive border border-destructive/20"
                    >
                      {h.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Event Chips */}
              <div className="flex flex-col gap-1 overflow-y-auto max-h-26.25 custom-scrollbar">
                {dayEvents.slice(0, 3).map((event) => {
                  const eventColor =
                    event.color || event.source?.color || "#3b82f6";
                  return (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      style={{ borderLeftColor: eventColor }}
                      className="w-full text-left text-xs px-2 py-1 rounded bg-accent/60 hover:bg-accent border-l-4 truncate transition-all duration-150 flex items-center justify-between gap-1 shadow-sm"
                    >
                      <span className="font-medium text-foreground truncate">
                        {event.title}
                      </span>
                      {!event.allDay && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(event.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}

                {dayEvents.length > 3 && (
                  <span className="text-[10px] font-semibold text-primary px-1">
                    +{dayEvents.length - 3} {t("polaris.calendar.moreEvents")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
