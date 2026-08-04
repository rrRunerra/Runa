"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "@/hooks/usePolarisCalendar";
import { MapPin, Clock, AlignLeft } from "lucide-react";
import { getHolidaysForDate } from "@/lib/calendarHelpers";

interface RrCalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedHolidayCountry: string;
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDate: (date: Date) => void;
}

const HOUR_HEIGHT = 64; // 64px per hour slot (1 minute = 64/60 px)

export function RrCalendarDayView({
  currentDate,
  events,
  selectedHolidayCountry,
  onSelectEvent,
  onSelectDate,
}: RrCalendarDayViewProps) {
  const { t } = useTranslation();

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const holidays = getHolidaysForDate(currentDate, selectedHolidayCountry);

  const dayStart = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0),
    [currentDate]
  );
  const dayEnd = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999),
    [currentDate]
  );

  const dayEvents = useMemo(() => {
    return events.filter((e) => {
      const eStart = new Date(e.start);
      const eEnd = new Date(e.end);
      return eStart <= dayEnd && eEnd >= dayStart;
    });
  }, [events, dayStart, dayEnd]);

  // Calculate layout offsets for connected blocks
  const positionedEvents = useMemo(() => {
    const totalDayMs = 24 * 60 * 60 * 1000;
    const totalPx = 24 * HOUR_HEIGHT;

    return dayEvents.map((event) => {
      const eStart = new Date(event.start);
      const eEnd = new Date(event.end);

      const clampedStartMs = Math.max(dayStart.getTime(), eStart.getTime());
      const clampedEndMs = Math.min(dayEnd.getTime(), eEnd.getTime());

      const startOffsetMs = clampedStartMs - dayStart.getTime();
      const durationMs = Math.max(25 * 60 * 1000, clampedEndMs - clampedStartMs); // min 25 mins

      const topPx = (startOffsetMs / totalDayMs) * totalPx;
      const heightPx = (durationMs / totalDayMs) * totalPx;

      return {
        event,
        topPx,
        heightPx,
      };
    });
  }, [dayEvents, dayStart, dayEnd]);

  return (
    <div className="flex flex-col h-full bg-background select-none">
      {/* Day Banner Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/40 shrink-0">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {currentDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {holidays.length > 0 && (
            <div className="flex gap-1.5 mt-1">
              {holidays.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/20"
                >
                  {h.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {dayEvents.length} {t("polaris.calendar.totalEvents")}
        </span>
      </div>

      {/* Timetable Schedule Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="relative border border-border/60 rounded-2xl bg-card/20 overflow-hidden">
          {/* Hourly slot rows */}
          <div className="flex flex-col">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setHours(hour, 0, 0, 0);
                  onSelectDate(d);
                }}
                className="flex items-start border-b border-border/40 hover:bg-accent/20 transition-colors cursor-pointer group px-3 pt-1 text-xs text-muted-foreground"
              >
                <span className="w-14 shrink-0 font-semibold group-hover:text-primary transition-colors">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span className="opacity-0 group-hover:opacity-100 text-[11px] text-muted-foreground transition-opacity">
                  + {t("polaris.calendar.addEventAtHour")} {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Absolute Continuous Event Blocks Overlay */}
          <div className="absolute inset-0 left-16 right-3 pointer-events-none">
            {positionedEvents.map(({ event, topPx, heightPx }) => {
              const eventColor = event.color || event.source?.color || "#3b82f6";
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEvent(event);
                  }}
                  style={{
                    top: `${topPx + 2}px`,
                    height: `${Math.max(32, heightPx - 4)}px`,
                    borderLeftColor: eventColor,
                  }}
                  className="absolute left-0 right-0 pointer-events-auto rounded-xl bg-card border border-border border-l-4 p-2.5 shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group z-10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-medium shrink-0 flex items-center gap-1 bg-accent/40 px-1.5 py-0.5 rounded-md">
                      <Clock className="size-3 text-primary" />
                      {new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {heightPx > 48 && (
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="size-3 text-primary shrink-0" />
                          {event.location}
                        </span>
                      )}
                      {event.description && (
                        <span className="flex items-center gap-1 truncate opacity-80">
                          <AlignLeft className="size-3 shrink-0" />
                          {event.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
