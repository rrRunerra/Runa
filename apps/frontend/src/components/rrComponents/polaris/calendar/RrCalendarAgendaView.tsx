"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "@/hooks/usePolarisCalendar";
import { Clock, MapPin, Calendar as CalendarIcon, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RrCalendarAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export function RrCalendarAgendaView({
  events,
  onSelectEvent,
}: RrCalendarAgendaViewProps) {
  const { t } = useTranslation();

  // Group events by date string YYYY-MM-DD sorted chronologically
  const groupedEvents = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const groups: Array<{ dateLabel: string; dateObj: Date; items: CalendarEvent[] }> = [];
    const map = new Map<string, { dateLabel: string; dateObj: Date; items: CalendarEvent[] }>();

    for (const event of sorted) {
      const d = new Date(event.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      let group = map.get(key);
      if (!group) {
        group = {
          dateLabel: d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          dateObj: d,
          items: [],
        };
        map.set(key, group);
        groups.push(group);
      }
      group.items.push(event);
    }

    return groups;
  }, [events]);

  if (groupedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
        <CalendarIcon className="size-12 text-muted-foreground/40 mb-3" />
        <h4 className="text-base font-semibold text-foreground">{t("polaris.calendar.noEventsFound")}</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {t("polaris.calendar.noEventsDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto custom-scrollbar p-6 space-y-6 select-none">
      {groupedEvents.map((group, idx) => (
        <div key={idx} className="space-y-3">
          <div className="flex items-center gap-3 sticky top-0 bg-background/90 backdrop-blur-md py-1 z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {group.dateLabel}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="grid gap-3">
            {group.items.map((event) => {
              const eventColor = event.color || event.source?.color || "#3b82f6";
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={{ borderLeftColor: eventColor }}
                  className="p-4 rounded-xl bg-card border border-border border-l-4 hover:border-primary/40 transition-all cursor-pointer shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </h4>
                      {event.source && (
                        <Badge variant="outline" className="text-[10px] h-5 border-border">
                          {event.source.name}
                        </Badge>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground shrink-0">
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" />
                        {event.location}
                      </span>
                    )}

                    <span className="flex items-center gap-1 font-medium bg-accent/60 px-2.5 py-1 rounded-lg">
                      <Clock className="size-3.5 text-primary" />
                      {event.allDay
                        ? t("polaris.calendar.allDay")
                        : `${new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
