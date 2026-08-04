"use client";

import useSWR from "swr";
import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface CalendarSource {
  id: string;
  userId: string;
  name: string;
  type: "NATIVE" | "GOOGLE" | "APPLE" | "XIAOMI" | "ICAL_FEED";
  url: string | null;
  color: string | null;
  enabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  color: string | null;
  url: string | null;
  externalId: string | null;
  reminderMinutes: number | null;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  source?: CalendarSource | null;
}

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

const authenticatedFetcher = ([url, token]: [string, string]) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch calendar data");
    return res.json();
  });

export function usePolarisCalendar() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[] | null>(null);
  const [selectedHolidayCountry, setSelectedHolidayCountry] = useState<string>("ALL");
  const [showJapaneseEra, setShowJapaneseEra] = useState<boolean>(false);
  const [showLunarCalendar, setShowLunarCalendar] = useState<boolean>(false);

  // SWR options: Dont auto-refresh on window focus or reconnect (only on page reload/manual mutation)
  const swrOptions = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  };

  const {
    data: eventsData,
    error: eventsError,
    isLoading: loadingEvents,
    mutate: mutateEvents,
  } = useSWR<CalendarEvent[]>(
    token ? [`${baseUrl}/polaris/calendar/events`, token] : null,
    authenticatedFetcher,
    swrOptions
  );

  const {
    data: sourcesData,
    error: sourcesError,
    isLoading: loadingSources,
    mutate: mutateSources,
  } = useSWR<CalendarSource[]>(
    token ? [`${baseUrl}/polaris/calendar/sources`, token] : null,
    authenticatedFetcher,
    swrOptions
  );

  const {
    data: tokenData,
    mutate: mutateToken,
  } = useSWR<{ token: string }>(
    token ? [`${baseUrl}/polaris/calendar/export-token`, token] : null,
    authenticatedFetcher,
    swrOptions
  );

  const sources = useMemo(() => sourcesData || [], [sourcesData]);

  // Compute active sources filter (null means all enabled by default)
  const filteredEvents = useMemo(() => {
    const events = eventsData || [];
    if (!selectedSourceIds) return events;
    return events.filter((e) => !e.sourceId || selectedSourceIds.includes(e.sourceId));
  }, [eventsData, selectedSourceIds]);

  // Toggle specific calendar source filter
  const toggleSourceFilter = useCallback(
    (sourceId: string) => {
      setSelectedSourceIds((prev) => {
        const current = prev ?? sources.map((s) => s.id);
        if (current.includes(sourceId)) {
          return current.filter((id) => id !== sourceId);
        }
        return [...current, sourceId];
      });
    },
    [sources]
  );

  // Event Mutations
  const createEvent = useCallback(
    async (payload: Partial<CalendarEvent>) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create event");
      }
      await mutateEvents();
    },
    [token, baseUrl, mutateEvents]
  );

  const updateEvent = useCallback(
    async (id: string, payload: Partial<CalendarEvent>) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/events/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update event");
      }
      await mutateEvents();
    },
    [token, baseUrl, mutateEvents]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/events/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete event");
      await mutateEvents();
    },
    [token, baseUrl, mutateEvents]
  );

  // Source Mutations
  const createSource = useCallback(
    async (payload: { name: string; type: string; url?: string; color?: string }) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/sources`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add calendar source");
      }
      await Promise.all([mutateSources(), mutateEvents()]);
    },
    [token, baseUrl, mutateSources, mutateEvents]
  );

  const updateSource = useCallback(
    async (id: string, payload: Partial<CalendarSource>) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/sources/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update source");
      await Promise.all([mutateSources(), mutateEvents()]);
    },
    [token, baseUrl, mutateSources, mutateEvents]
  );

  const syncSource = useCallback(
    async (id: string) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/sources/${id}/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to sync source");
      await Promise.all([mutateSources(), mutateEvents()]);
    },
    [token, baseUrl, mutateSources, mutateEvents]
  );

  const deleteSource = useCallback(
    async (id: string) => {
      if (!token) return;
      const res = await fetch(`${baseUrl}/polaris/calendar/sources/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete source");
      await Promise.all([mutateSources(), mutateEvents()]);
    },
    [token, baseUrl, mutateSources, mutateEvents]
  );

  const regenerateExportToken = useCallback(async () => {
    if (!token) throw new Error("Unauthorized");
    const res = await fetch(`${baseUrl}/polaris/calendar/export-token/regenerate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Failed to regenerate token");
    const data = await res.json();
    await mutateToken(data);
    return data.token;
  }, [token, baseUrl, mutateToken]);

  return {
    events: filteredEvents,
    rawEvents: eventsData || [],
    sources,
    exportToken: tokenData?.token || null,
    loading: loadingEvents || loadingSources,
    error: eventsError || sourcesError,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    selectedSourceIds,
    toggleSourceFilter,
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
    refetchEvents: mutateEvents,
    refetchSources: mutateSources,
  };
}
