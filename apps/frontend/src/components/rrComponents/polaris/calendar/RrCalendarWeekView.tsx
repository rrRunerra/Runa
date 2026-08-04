"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/hooks/usePolarisCalendar";
import { getHolidaysForDate } from "@/lib/calendarHelpers";

interface RrCalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedHolidayCountry: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
}

const HOUR_HEIGHT = 56; // 56px per hour slot

export function RrCalendarWeekView({
  currentDate,
  events,
  selectedHolidayCountry,
  onSelectEvent,
  onSelectDate,
}: RrCalendarWeekViewProps) {
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay()));
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        new Date(
          firstDay.getFullYear(),
          firstDay.getMonth(),
          firstDay.getDate() + i,
        ),
      );
    }
    return days;
  }, [currentDate]);

  const todayStr = new Date().toDateString();

  return (
    <div className="flex flex-col h-full bg-background overflow-x-auto select-none">
      {/* Week Header Days */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card/40 py-2 sticky top-0 z-20">
        <div className="text-center text-xs text-muted-foreground font-semibold flex items-center justify-center">
          GMT
        </div>
        {weekDays.map((date, idx) => {
          const isToday = date.toDateString() === todayStr;
          const holidays = getHolidaysForDate(date, selectedHolidayCountry);

          return (
            <div
              key={idx}
              onClick={() => onSelectDate(date)}
              className="flex flex-col items-center justify-center cursor-pointer group"
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={`size-7 flex items-center justify-center text-xs font-bold rounded-full mt-0.5 ${
                  isToday
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-foreground group-hover:text-primary"
                }`}
              >
                {date.getDate()}
              </span>
              {holidays.length > 0 && (
                <span className="text-[9px] text-destructive truncate max-w-20">
                  {holidays[0].name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hourly Timetable Grid with Continuous Connected Events */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          {/* Time Labels Sidebar Column */}
          <div className="flex flex-col border-r border-border/40 bg-card/20">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="text-right pr-2 pt-1 text-[11px] font-medium text-muted-foreground border-b border-border/40"
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* 7 Day Columns */}
          {weekDays.map((dayDate, dayIdx) => {
            const dayStart = new Date(
              dayDate.getFullYear(),
              dayDate.getMonth(),
              dayDate.getDate(),
              0,
              0,
              0,
              0,
            );
            const dayEnd = new Date(
              dayDate.getFullYear(),
              dayDate.getMonth(),
              dayDate.getDate(),
              23,
              59,
              59,
              999,
            );

            const dayEvents = events.filter((e) => {
              const eStart = new Date(e.start);
              const eEnd = new Date(e.end);
              return eStart <= dayEnd && eEnd >= dayStart;
            });

            const totalDayMs = 24 * 60 * 60 * 1000;
            const totalPx = 24 * HOUR_HEIGHT;

            return (
              <div key={dayIdx} className="relative border-r border-border/40">
                {/* Hourly Background Clickable Slots */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => {
                      const d = new Date(dayDate);
                      d.setHours(hour, 0, 0, 0);
                      onSelectDate(d);
                    }}
                    className="border-b border-border/40 hover:bg-accent/20 transition-colors cursor-pointer"
                  />
                ))}

                {/* Continuous Event Blocks */}
                {dayEvents.map((event) => {
                  const eStart = new Date(event.start);
                  const eEnd = new Date(event.end);

                  const clampedStartMs = Math.max(
                    dayStart.getTime(),
                    eStart.getTime(),
                  );
                  const clampedEndMs = Math.min(
                    dayEnd.getTime(),
                    eEnd.getTime(),
                  );

                  const startOffsetMs = clampedStartMs - dayStart.getTime();
                  const durationMs = Math.max(
                    20 * 60 * 1000,
                    clampedEndMs - clampedStartMs,
                  );

                  const topPx = (startOffsetMs / totalDayMs) * totalPx;
                  const heightPx = (durationMs / totalDayMs) * totalPx;

                  const eventColor =
                    event.color || event.source?.color || "#3b82f6";

                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(event);
                      }}
                      style={{
                        top: `${topPx + 1}px`,
                        height: `${Math.max(24, heightPx - 2)}px`,
                        borderLeftColor: eventColor,
                      }}
                      className="absolute left-1 right-1 pointer-events-auto rounded-lg bg-card/90 backdrop-blur-md border border-border border-l-4 p-1.5 shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group z-10"
                    >
                      <div className="font-bold text-[11px] text-foreground truncate group-hover:text-primary transition-colors">
                        {event.title}
                      </div>

                      {heightPx >= 36 && (
                        <div className="text-[10px] text-muted-foreground font-medium truncate">
                          {new Date(event.start).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(event.end).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
