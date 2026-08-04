import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { CalendarRepository } from './calendar.repository';
import { NotificationService } from '../notification/notification.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let repository: jest.Mocked<CalendarRepository>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const mockRepo = {
      findEventsByUser: jest.fn(),
      findEventById: jest.fn(),
      createEvent: jest.fn(),
      updateEvent: jest.fn(),
      deleteEvent: jest.fn(),
      deleteEventsBySource: jest.fn(),
      findSourcesByUser: jest.fn(),
      findAllEnabledSources: jest.fn(),
      findSourceById: jest.fn(),
      createSource: jest.fn(),
      updateSource: jest.fn(),
      updateSourceLastSynced: jest.fn(),
      deleteSource: jest.fn(),
      findUserExportToken: jest.fn(),
      updateUserExportToken: jest.fn(),
      findUserByExportToken: jest.fn(),
      findPendingReminders: jest.fn(),
      markReminderSent: jest.fn(),
      upsertExternalEvent: jest.fn(),
    };

    const mockNotificationService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: CalendarRepository, useValue: mockRepo },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    repository = module.get(CalendarRepository);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEvents', () => {
    it('should return user events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          userId: 'user-1',
          sourceId: null,
          title: 'Test Event',
          description: null,
          location: null,
          start: new Date('2026-08-04T10:00:00Z'),
          end: new Date('2026-08-04T11:00:00Z'),
          allDay: false,
          color: null,
          url: null,
          externalId: null,
          reminderMinutes: null,
          reminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repository.findEventsByUser.mockResolvedValue(mockEvents as any);

      const result = await service.getEvents('user-1');
      expect(result).toEqual(mockEvents);
      expect(repository.findEventsByUser).toHaveBeenCalledWith('user-1', undefined, undefined);
    });
  });

  describe('createEvent', () => {
    it('should create native calendar event', async () => {
      const dto = {
        title: 'New Meeting',
        start: '2026-08-04T10:00:00Z',
        end: '2026-08-04T11:00:00Z',
      };

      const mockCreated = {
        id: 'event-2',
        userId: 'user-1',
        ...dto,
        start: new Date(dto.start),
        end: new Date(dto.end),
      };

      repository.createEvent.mockResolvedValue(mockCreated as any);

      const result = await service.createEvent('user-1', dto);
      expect(result).toEqual(mockCreated);
      expect(repository.createEvent).toHaveBeenCalledWith('user-1', dto);
    });

    it('should throw error if start date is after end date', async () => {
      const dto = {
        title: 'Invalid Meeting',
        start: '2026-08-04T12:00:00Z',
        end: '2026-08-04T10:00:00Z',
      };

      await expect(service.createEvent('user-1', dto)).rejects.toThrow();
    });
  });

  describe('parseIcsFeed', () => {
    it('should parse standard VEVENT string', () => {
      const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:uid-123@example.com
SUMMARY:Sample Meeting
DESCRIPTION:Important discussions
LOCATION:Room 101
DTSTART:20260804T140000Z
DTEND:20260804T150000Z
END:VEVENT
END:VCALENDAR`;

      const parsed = (service as any).parseIcsFeed(ics);
      expect(parsed.length).toBe(1);
      expect(parsed[0].summary).toBe('Sample Meeting');
      expect(parsed[0].description).toBe('Important discussions');
      expect(parsed[0].location).toBe('Room 101');
      expect(parsed[0].uid).toBe('uid-123@example.com');
    });
  });
});
