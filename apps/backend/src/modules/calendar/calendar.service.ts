import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CalendarRepository } from './calendar.repository';
import {
  CreateCalendarEventDto,
  CreateCalendarSourceDto,
  UpdateCalendarEventDto,
  UpdateCalendarSourceDto,
} from './calendar.dto';
import { CalendarEventEntity, CalendarSourceEntity } from './calendar.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '@runa/notifications';
import { rrNotFoundException, rrBadRequestException } from 'src/providers/error';
import { randomBytes } from 'crypto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly moduleCode = 'CalSve-';

  constructor(
    private readonly repository: CalendarRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Event Operations
  // ---------------------------------------------------------------------------

  async getEvents(
    userId: string,
    startRange?: string,
    endRange?: string,
  ): Promise<CalendarEventEntity[]> {
    const start = startRange ? new Date(startRange) : undefined;
    const end = endRange ? new Date(endRange) : undefined;
    return this.repository.findEventsByUser(userId, start, end);
  }

  async getEventById(id: string, userId: string): Promise<CalendarEventEntity> {
    const event = await this.repository.findEventById(id, userId);
    if (!event) {
      throw new rrNotFoundException(`${this.moduleCode}EVNF001`, {
        message: `Calendar event with ID ${id} not found`,
      });
    }
    return event;
  }

  async createEvent(
    userId: string,
    dto: CreateCalendarEventDto,
  ): Promise<CalendarEventEntity> {
    if (new Date(dto.start) > new Date(dto.end)) {
      throw new rrBadRequestException(`${this.moduleCode}INVALID_DATES`, {
        message: 'Event start date cannot be after end date',
      });
    }
    return this.repository.createEvent(userId, dto);
  }

  async updateEvent(
    id: string,
    userId: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventEntity> {
    await this.getEventById(id, userId);
    if (dto.start && dto.end && new Date(dto.start) > new Date(dto.end)) {
      throw new rrBadRequestException(`${this.moduleCode}INVALID_DATES`, {
        message: 'Event start date cannot be after end date',
      });
    }
    return this.repository.updateEvent(id, userId, dto);
  }

  async deleteEvent(id: string, userId: string): Promise<{ success: boolean }> {
    await this.getEventById(id, userId);
    await this.repository.deleteEvent(id);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Source / Feed Operations
  // ---------------------------------------------------------------------------

  async getSources(userId: string): Promise<CalendarSourceEntity[]> {
    return this.repository.findSourcesByUser(userId);
  }

  async createSource(
    userId: string,
    dto: CreateCalendarSourceDto,
  ): Promise<CalendarSourceEntity> {
    const source = await this.repository.createSource(userId, dto);
    if (source.url && source.enabled) {
      // Trigger background sync immediately for the new feed
      this.syncSourceFeed(source).catch((err) => {
        this.logger.error(`Initial feed sync failed for source ${source.id}: ${err.message}`);
      });
    }
    return source;
  }

  async updateSource(
    id: string,
    userId: string,
    dto: UpdateCalendarSourceDto,
  ): Promise<CalendarSourceEntity> {
    const existing = await this.repository.findSourceById(id, userId);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}SRCNF001`, {
        message: `Calendar source with ID ${id} not found`,
      });
    }
    const updated = await this.repository.updateSource(id, userId, dto);
    if (updated.url && updated.enabled) {
      this.syncSourceFeed(updated).catch((err) => {
        this.logger.error(`Feed sync failed for source ${updated.id}: ${err.message}`);
      });
    }
    return updated;
  }

  async deleteSource(id: string, userId: string): Promise<{ success: boolean }> {
    const existing = await this.repository.findSourceById(id, userId);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}SRCNF002`, {
        message: `Calendar source with ID ${id} not found`,
      });
    }
    await this.repository.deleteEventsBySource(id);
    await this.repository.deleteSource(id);
    return { success: true };
  }

  async syncSourceById(id: string, userId: string): Promise<{ success: boolean; count: number }> {
    const source = await this.repository.findSourceById(id, userId);
    if (!source) {
      throw new rrNotFoundException(`${this.moduleCode}SRCNF003`, {
        message: `Calendar source with ID ${id} not found`,
      });
    }
    const count = await this.syncSourceFeed(source);
    return { success: true, count };
  }

  // ---------------------------------------------------------------------------
  // iCal Syncing Engine & Parser
  // ---------------------------------------------------------------------------

  @Cron(CronExpression.EVERY_HOUR)
  async syncAllSourcesCron(): Promise<void> {
    this.logger.log('Starting hourly calendar feed sync cron...');
    const sources = await this.repository.findAllEnabledSources();
    let totalSynced = 0;
    for (const source of sources) {
      if (source.url) {
        try {
          const count = await this.syncSourceFeed(source);
          totalSynced += count;
        } catch (err: any) {
          this.logger.error(`Failed to sync calendar source ${source.id} (${source.name}): ${err.message}`);
        }
      }
    }
    this.logger.log(`Hourly calendar feed sync completed. Synced ${totalSynced} events across ${sources.length} sources.`);
  }

  async syncSourceFeed(source: CalendarSourceEntity): Promise<number> {
    if (!source.url) return 0;

    let feedUrl = source.url.trim();
    if (feedUrl.startsWith('webcal://')) {
      feedUrl = 'https://' + feedUrl.substring(9);
    }

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Runa-Realm-Polaris-Calendar/1.0',
        Accept: 'text/calendar, application/ics, text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const icsContent = await response.text();
    const events = this.parseIcsFeed(icsContent);

    for (const event of events) {
      await this.repository.upsertExternalEvent(
        source.userId,
        source.id,
        event.uid,
        {
          title: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          url: event.url,
          color: source.color || undefined,
        },
      );
    }

    await this.repository.updateSourceLastSynced(source.id);
    return events.length;
  }

  private parseIcsFeed(ics: string): Array<{
    uid: string;
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    allDay: boolean;
    url?: string;
  }> {
    const results: Array<{
      uid: string;
      summary: string;
      description?: string;
      location?: string;
      start: Date;
      end: Date;
      allDay: boolean;
      url?: string;
    }> = [];

    // Unfold lines wrapped with CRLF + space/tab
    const unfolded = ics.replace(/\r?\n[ \t]/g, '');
    const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
    let match: RegExpExecArray | null;

    while ((match = veventRegex.exec(unfolded)) !== null) {
      const block = match[1];
      const uidMatch = block.match(/^UID:(.*)$/m);
      const summaryMatch = block.match(/^SUMMARY:(.*)$/m);
      const dtStartMatch = block.match(/^DTSTART(?:;VALUE=DATE|;TZID=[^:]+)?:(.*)$/m);
      const dtEndMatch = block.match(/^DTEND(?:;VALUE=DATE|;TZID=[^:]+)?:(.*)$/m);
      const descriptionMatch = block.match(/^DESCRIPTION:(.*)$/m);
      const locationMatch = block.match(/^LOCATION:(.*)$/m);
      const urlMatch = block.match(/^URL:(.*)$/m);

      if (!summaryMatch || !dtStartMatch) continue;

      const summary = this.unescapeIcsText(summaryMatch[1].trim());
      const uid = uidMatch ? uidMatch[1].trim() : `${summary}-${dtStartMatch[1].trim()}`;
      const isAllDay = block.includes('VALUE=DATE:') || dtStartMatch[1].trim().length === 8;

      const start = this.parseIcsDate(dtStartMatch[1].trim());
      let end = dtEndMatch ? this.parseIcsDate(dtEndMatch[1].trim()) : new Date(start.getTime() + 60 * 60 * 1000);

      if (isAllDay && dtEndMatch) {
        // iCal all-day DTEND is exclusive, subtract 1 sec to keep end on end day
        end = new Date(end.getTime() - 1000);
      }

      results.push({
        uid,
        summary: summary || 'Untitled Event',
        description: descriptionMatch ? this.unescapeIcsText(descriptionMatch[1].trim()) : undefined,
        location: locationMatch ? this.unescapeIcsText(locationMatch[1].trim()) : undefined,
        start,
        end,
        allDay: isAllDay,
        url: urlMatch ? urlMatch[1].trim() : undefined,
      });
    }

    return results;
  }

  private parseIcsDate(str: string): Date {
    const clean = str.trim().replace(/[^0-9T]/g, '');
    if (clean.length === 8) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      return new Date(Date.UTC(y, m, d));
    }
    if (clean.length >= 15) {
      const y = parseInt(clean.substring(0, 4), 10);
      const m = parseInt(clean.substring(4, 6), 10) - 1;
      const d = parseInt(clean.substring(6, 8), 10);
      const hh = parseInt(clean.substring(9, 11), 10);
      const mm = parseInt(clean.substring(11, 13), 10);
      const ss = parseInt(clean.substring(13, 15), 10);
      if (str.endsWith('Z')) {
        return new Date(Date.UTC(y, m, d, hh, mm, ss));
      }
      return new Date(y, m, d, hh, mm, ss);
    }
    return new Date(str);
  }

  private unescapeIcsText(str: string): string {
    return str
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  // ---------------------------------------------------------------------------
  // Reminder Checker Cron
  // ---------------------------------------------------------------------------

  @Cron(CronExpression.EVERY_MINUTE)
  async checkRemindersCron(): Promise<void> {
    const now = new Date();
    const pending = await this.repository.findPendingReminders(now);

    for (const event of pending) {
      try {
        await this.notificationService.create(event.userId, {
          title: `Reminder: ${event.title}`,
          message: event.location
            ? `Starts at ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${event.location})`
            : `Starts at ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          type: 'INFO' as NotificationType,
          metadata: {
            eventId: event.id,
            start: event.start.toISOString(),
            location: event.location,
          },
        });
        await this.repository.markReminderSent(event.id);
      } catch (err: any) {
        this.logger.error(`Failed to send reminder for event ${event.id}: ${err.message}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // iCal Export Engine
  // ---------------------------------------------------------------------------

  async getExportToken(userId: string): Promise<string> {
    let token = await this.repository.findUserExportToken(userId);
    if (!token) {
      token = randomBytes(24).toString('hex');
      await this.repository.updateUserExportToken(userId, token);
    }
    return token;
  }

  async regenerateExportToken(userId: string): Promise<string> {
    const newToken = randomBytes(24).toString('hex');
    return this.repository.updateUserExportToken(userId, newToken);
  }

  async generateIcsFeedByToken(token: string): Promise<string> {
    const user = await this.repository.findUserByExportToken(token);
    if (!user) {
      throw new rrNotFoundException(`${this.moduleCode}TOKEN_INVALID`, {
        message: 'Invalid or expired calendar export token',
      });
    }

    const events = await this.repository.findEventsByUser(user.id);
    return this.buildIcsContent(user.username, events);
  }

  private buildIcsContent(username: string, events: CalendarEventEntity[]): string {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//Runa Realm//Polaris Calendar ${username}//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Polaris Calendar (${username})`,
      'X-WR-TIMEZONE:UTC',
    ];

    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const formatDateOnly = (date: Date): string => {
      return date.toISOString().substring(0, 10).replace(/-/g, '');
    };

    const escapeText = (str: string): string => {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    for (const event of events) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.externalId || event.id}@polaris.runa`);
      lines.push(`SUMMARY:${escapeText(event.title)}`);
      if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
      if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
      if (event.url) lines.push(`URL:${escapeText(event.url)}`);
      lines.push(`DTSTAMP:${formatDate(event.createdAt || new Date())}`);

      if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(new Date(event.start))}`);
        lines.push(`DTEND;VALUE=DATE:${formatDateOnly(new Date(event.end))}`);
      } else {
        lines.push(`DTSTART:${formatDate(new Date(event.start))}`);
        lines.push(`DTEND:${formatDate(new Date(event.end))}`);
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
