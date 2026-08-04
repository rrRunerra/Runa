import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CalendarEventEntity, CalendarSourceEntity } from './calendar.entity';
import {
  CreateCalendarEventDto,
  CreateCalendarSourceDto,
  UpdateCalendarEventDto,
  UpdateCalendarSourceDto,
} from './calendar.dto';

@Injectable()
export class CalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Calendar Events
  // ---------------------------------------------------------------------------

  async findEventsByUser(
    userId: string,
    startRange?: Date,
    endRange?: Date,
  ): Promise<CalendarEventEntity[]> {
    const where: any = { userId };
    if (startRange || endRange) {
      where.AND = [];
      if (startRange) {
        where.AND.push({ end: { gte: startRange } });
      }
      if (endRange) {
        where.AND.push({ start: { lte: endRange } });
      }
    }

    return (await this.prisma.client.polarisCalendarEvent.findMany({
      where,
      include: { source: true },
      orderBy: { start: 'asc' },
    })) as unknown as CalendarEventEntity[];
  }

  async findEventById(id: string, userId: string): Promise<CalendarEventEntity | null> {
    return (await this.prisma.client.polarisCalendarEvent.findFirst({
      where: { id, userId },
      include: { source: true },
    })) as unknown as CalendarEventEntity | null;
  }

  async createEvent(
    userId: string,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventEntity> {
    return (await this.prisma.client.polarisCalendarEvent.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description || null,
        location: dto.location || null,
        start: new Date(dto.start),
        end: new Date(dto.end),
        allDay: dto.allDay ?? false,
        color: dto.color || null,
        url: dto.url || null,
        sourceId: dto.sourceId || null,
        reminderMinutes: dto.reminderMinutes ?? null,
      },
      include: { source: true },
    })) as unknown as CalendarEventEntity;
  }

  async updateEvent(
    id: string,
    userId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventEntity> {
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.start !== undefined) data.start = new Date(dto.start);
    if (dto.end !== undefined) data.end = new Date(dto.end);
    if (dto.allDay !== undefined) data.allDay = dto.allDay;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.reminderMinutes !== undefined) data.reminderMinutes = dto.reminderMinutes;

    return (await this.prisma.client.polarisCalendarEvent.update({
      where: { id },
      data,
      include: { source: true },
    })) as unknown as CalendarEventEntity;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.prisma.client.polarisCalendarEvent.delete({
      where: { id },
    });
  }

  async deleteEventsBySource(sourceId: string): Promise<void> {
    await this.prisma.client.polarisCalendarEvent.deleteMany({
      where: { sourceId },
    });
  }

  // ---------------------------------------------------------------------------
  // Calendar Sources / Feeds
  // ---------------------------------------------------------------------------

  async findSourcesByUser(userId: string): Promise<CalendarSourceEntity[]> {
    return (await this.prisma.client.polarisCalendarSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })) as unknown as CalendarSourceEntity[];
  }

  async findAllEnabledSources(): Promise<CalendarSourceEntity[]> {
    return (await this.prisma.client.polarisCalendarSource.findMany({
      where: { enabled: true },
    })) as unknown as CalendarSourceEntity[];
  }

  async findSourceById(id: string, userId: string): Promise<CalendarSourceEntity | null> {
    return (await this.prisma.client.polarisCalendarSource.findFirst({
      where: { id, userId },
    })) as unknown as CalendarSourceEntity | null;
  }

  async createSource(
    userId: string,
    dto: CreateCalendarSourceDto,
  ): Promise<CalendarSourceEntity> {
    return (await this.prisma.client.polarisCalendarSource.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        url: dto.url || null,
        color: dto.color || '#3b82f6',
        enabled: true,
      },
    })) as unknown as CalendarSourceEntity;
  }

  async updateSource(
    id: string,
    userId: string,
    dto: UpdateCalendarSourceDto,
  ): Promise<CalendarSourceEntity> {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    return (await this.prisma.client.polarisCalendarSource.update({
      where: { id },
      data,
    })) as unknown as CalendarSourceEntity;
  }

  async updateSourceLastSynced(id: string): Promise<void> {
    await this.prisma.client.polarisCalendarSource.update({
      where: { id },
      data: { lastSyncedAt: new Date() },
    });
  }

  async deleteSource(id: string): Promise<void> {
    await this.prisma.client.polarisCalendarSource.delete({
      where: { id },
    });
  }

  // ---------------------------------------------------------------------------
  // Export Token & Reminders
  // ---------------------------------------------------------------------------

  async findUserExportToken(userId: string): Promise<string | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { calendarExportToken: true },
    });
    return user?.calendarExportToken || null;
  }

  async updateUserExportToken(userId: string, token: string): Promise<string> {
    const updated = await this.prisma.client.user.update({
      where: { id: userId },
      data: { calendarExportToken: token },
      select: { calendarExportToken: true },
    });
    return updated.calendarExportToken!;
  }

  async findUserByExportToken(token: string): Promise<{ id: string; username: string } | null> {
    return (await this.prisma.client.user.findFirst({
      where: { calendarExportToken: token },
      select: { id: true, username: true },
    })) as { id: string; username: string } | null;
  }

  async findPendingReminders(now: Date): Promise<CalendarEventEntity[]> {
    // Find events with reminderMinutes set, reminderSent false, where (start - reminderMinutes) <= now
    const events = await this.prisma.client.polarisCalendarEvent.findMany({
      where: {
        reminderMinutes: { not: null },
        reminderSent: false,
        start: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) }, // up to 24h ahead
      },
    });

    return events.filter((e) => {
      if (!e.reminderMinutes) return false;
      const reminderTime = new Date(e.start.getTime() - e.reminderMinutes * 60 * 1000);
      return reminderTime <= now && e.start >= now;
    }) as unknown as CalendarEventEntity[];
  }

  async markReminderSent(eventId: string): Promise<void> {
    await this.prisma.client.polarisCalendarEvent.update({
      where: { id: eventId },
      data: { reminderSent: true },
    });
  }

  async upsertExternalEvent(
    userId: string,
    sourceId: string,
    externalId: string,
    eventData: {
      title: string;
      description?: string | null;
      location?: string | null;
      start: Date;
      end: Date;
      allDay?: boolean;
      url?: string | null;
      color?: string | null;
    },
  ): Promise<void> {
    const existing = await this.prisma.client.polarisCalendarEvent.findFirst({
      where: { sourceId, externalId },
    });

    if (existing) {
      await this.prisma.client.polarisCalendarEvent.update({
        where: { id: existing.id },
        data: {
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          start: eventData.start,
          end: eventData.end,
          allDay: eventData.allDay ?? false,
          url: eventData.url || null,
          color: eventData.color || null,
        },
      });
    } else {
      await this.prisma.client.polarisCalendarEvent.create({
        data: {
          userId,
          sourceId,
          externalId,
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          start: eventData.start,
          end: eventData.end,
          allDay: eventData.allDay ?? false,
          url: eventData.url || null,
          color: eventData.color || null,
        },
      });
    }
  }
}
