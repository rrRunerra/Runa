export interface CalendarSourceEntity {
  id: string;
  userId: string;
  name: string;
  type: string;
  url: string | null;
  color: string | null;
  enabled: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventEntity {
  id: string;
  userId: string;
  sourceId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string | null;
  url: string | null;
  externalId: string | null;
  reminderMinutes: number | null;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  source?: CalendarSourceEntity | null;
}
