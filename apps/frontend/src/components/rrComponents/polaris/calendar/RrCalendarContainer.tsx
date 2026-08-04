"use client";

import { useState } from "react";
import { usePolarisCalendar, CalendarEvent } from "@/hooks/usePolarisCalendar";
import { RrCalendarHeader } from "./RrCalendarHeader";
import { RrCalendarMonthView } from "./RrCalendarMonthView";
import { RrCalendarWeekView } from "./RrCalendarWeekView";
import { RrCalendarDayView } from "./RrCalendarDayView";
import { RrCalendarAgendaView } from "./RrCalendarAgendaView";
import { RrCalendarEventModal } from "./RrCalendarEventModal";
import { RrCalendarSourcesModal } from "./RrCalendarSourcesModal";
import { Skeleton } from "@/components/ui/skeleton";

interface RrCalendarContainerProps {
  className?: string;
}

export function RrCalendarContainer({ className = "" }: RrCalendarContainerProps) {
  const {
    events,
    sources,
    exportToken,
    loading,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    selectedHolidayCountry,
    setSelectedHolidayCountry,
    showJapaneseEra,
    setShowJapaneseEra,
    showLunarCalendar,
    setShowLunarCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    createSource,
    updateSource,
    syncSource,
    deleteSource,
    regenerateExportToken,
  } = usePolarisCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    const nextDate = new Date(currentDate);
    if (direction === "today") {
      setCurrentDate(new Date());
      return;
    }

    const step = direction === "next" ? 1 : -1;
    if (viewMode === "month") {
      nextDate.setMonth(nextDate.getMonth() + step);
    } else if (viewMode === "week") {
      nextDate.setDate(nextDate.getDate() + step * 7);
    } else if (viewMode === "day") {
      nextDate.setDate(nextDate.getDate() + step);
    }
    setCurrentDate(nextDate);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsEventModalOpen(true);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setIsEventModalOpen(true);
  };

  const handleOpenNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (payload: Partial<CalendarEvent>) => {
    if (payload.id) {
      await updateEvent(payload.id, payload);
    } else {
      await createEvent(payload);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEvent(id);
  };

  return (
    <div className={`flex flex-col h-full w-full bg-background rounded-2xl border border-border overflow-hidden shadow-2xl ${className}`}>
      {/* Header Toolbar */}
      <RrCalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigate={handleNavigate}
        onOpenNewEventModal={handleOpenNewEvent}
        onOpenSourcesModal={() => setIsSourcesModalOpen(true)}
        selectedHolidayCountry={selectedHolidayCountry}
        onSelectHolidayCountry={setSelectedHolidayCountry}
        showJapaneseEra={showJapaneseEra}
        onToggleJapaneseEra={() => setShowJapaneseEra(!showJapaneseEra)}
        showLunarCalendar={showLunarCalendar}
        onToggleLunarCalendar={() => setShowLunarCalendar(!showLunarCalendar)}
        isSyncing={loading}
      />

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="p-6 space-y-4 h-full">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {viewMode === "month" && (
              <RrCalendarMonthView
                currentDate={currentDate}
                events={events}
                selectedHolidayCountry={selectedHolidayCountry}
                showJapaneseEra={showJapaneseEra}
                showLunarCalendar={showLunarCalendar}
                onSelectEvent={handleSelectEvent}
                onSelectDate={handleSelectDate}
              />
            )}

            {viewMode === "week" && (
              <RrCalendarWeekView
                currentDate={currentDate}
                events={events}
                selectedHolidayCountry={selectedHolidayCountry}
                onSelectEvent={handleSelectEvent}
                onSelectDate={handleSelectDate}
              />
            )}

            {viewMode === "day" && (
              <RrCalendarDayView
                currentDate={currentDate}
                events={events}
                selectedHolidayCountry={selectedHolidayCountry}
                onSelectEvent={handleSelectEvent}
                onSelectDate={handleSelectDate}
              />
            )}

            {viewMode === "agenda" && (
              <RrCalendarAgendaView
                events={events}
                onSelectEvent={handleSelectEvent}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isEventModalOpen && (
        <RrCalendarEventModal
          open={isEventModalOpen}
          onOpenChange={setIsEventModalOpen}
          event={selectedEvent}
          selectedDate={selectedDate}
          sources={sources}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {isSourcesModalOpen && (
        <RrCalendarSourcesModal
          open={isSourcesModalOpen}
          onOpenChange={setIsSourcesModalOpen}
          sources={sources}
          exportToken={exportToken}
          onCreateSource={createSource}
          onUpdateSource={updateSource}
          onSyncSource={syncSource}
          onDeleteSource={deleteSource}
          onRegenerateExportToken={regenerateExportToken}
        />
      )}
    </div>
  );
}
