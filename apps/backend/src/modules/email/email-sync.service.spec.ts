import { Test, TestingModule } from '@nestjs/testing';
import { EmailSyncService } from './email-sync.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';

const mockSearch = jest.fn();
const mockFetch = jest.fn();
const mockList = jest.fn();
const mockGetMailboxLock = jest.fn();
const mockConnect = jest.fn();
const mockLogout = jest.fn();

jest.mock('imapflow', () => {
  return {
    ImapFlow: jest.fn().mockImplementation(() => {
      return {
        connect: mockConnect,
        list: mockList,
        getMailboxLock: mockGetMailboxLock,
        search: mockSearch,
        fetch: mockFetch,
        logout: mockLogout,
        on: jest.fn(),
      };
    }),
  };
});

jest.mock('@runa/crypto/node', () => ({
  generateDataKey: jest.fn(() => Buffer.from('mockKey')),
  encrypt: jest.fn((data) => {
    if (Buffer.isBuffer(data)) return data;
    return `enc:${data}`;
  }),
  wrapKey: jest.fn(async () => 'mockEncKey'),
}));

jest.mock('@runa/crypto/server', () => ({
  encrypt: jest.fn((text) => `enc:${text}`),
  decrypt: jest.fn((text) => text.replace('enc:', '')),
}));

describe('EmailSyncService', () => {
  let service: EmailSyncService;

  const mockPrismaClient = {
    userEmailAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    emailMessage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<EmailSyncService>(EmailSyncService);

    // Default implementations for ImapFlow mocks
    mockConnect.mockResolvedValue(undefined);
    mockList.mockResolvedValue([{ path: 'INBOX', specialUse: '\\Inbox' }]);
    mockGetMailboxLock.mockResolvedValue({ release: jest.fn() });
    mockSearch.mockResolvedValue([]);
    mockFetch.mockImplementation(async function* () {});
    mockLogout.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncAccount', () => {
    it('should delete local emails that are missing on the remote server', async () => {
      // 1. Setup DB mocks for the account and user
      mockPrismaClient.userEmailAccount.findUnique.mockResolvedValue({
        id: 'acc-123',
        emailAddress: 'test@example.com',
        username: 'john_doe',
        encryptedPassword: 'enc:secret_password',
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        loginEmail: 'test@example.com',
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-123',
        username: 'john_doe',
        userPublicKey: 'mockPublicKey',
      });

      // Highest cached UID is 100
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({ uid: 100 });

      // All UIDs currently on the remote server
      mockSearch.mockResolvedValue([90, 91, 95, 101, 102]);

      // All UIDs currently stored locally in DB
      mockPrismaClient.emailMessage.findMany.mockResolvedValue([
        { uid: 90 },
        { uid: 91 },
        { uid: 92 }, // missing on server
        { uid: 95 },
        { uid: 100 }, // missing on server
      ]);

      // Mock fetch implementation to yield nothing
      mockFetch.mockImplementation(async function* () {});

      // 2. Run sync
      await service.syncAccount('acc-123');

      // 3. Verify that the correct messages were deleted
      expect(mockPrismaClient.emailMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          userEmailAccountId: 'acc-123',
          folder: 'inbox',
          uid: { in: [92, 100] },
        },
      });

      // 4. Verify that fetch was called with the newer UIDs (> 100)
      expect(mockFetch).toHaveBeenCalledWith(
        [101, 102],
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('isWithinSyncWindow', () => {
    it('should return false if syncEnabled is false', () => {
      const result = service.isWithinSyncWindow({ syncEnabled: false });
      expect(result).toBe(false);
    });

    it('should return true if syncTimeRangeEnabled is false (24/7 sync)', () => {
      const result = service.isWithinSyncWindow({
        syncEnabled: true,
        syncTimeRangeEnabled: false,
      });
      expect(result).toBe(true);
    });

    it('should respect daytime active hours in specified timezone', () => {
      // 2026-08-16T12:00:00Z is 14:00 in Europe/Berlin (UTC+2 DST)
      const now = new Date('2026-08-16T12:00:00Z');

      const insideWindow = service.isWithinSyncWindow(
        {
          syncEnabled: true,
          syncTimeRangeEnabled: true,
          syncStartTime: '08:00',
          syncEndTime: '18:00',
          syncTimezone: 'Europe/Berlin',
        },
        now,
      );
      expect(insideWindow).toBe(true);

      const outsideWindow = service.isWithinSyncWindow(
        {
          syncEnabled: true,
          syncTimeRangeEnabled: true,
          syncStartTime: '15:00',
          syncEndTime: '20:00',
          syncTimezone: 'Europe/Berlin',
        },
        now,
      );
      expect(outsideWindow).toBe(false);
    });

    it('should handle overnight active hours across midnight', () => {
      // 2026-08-16T22:30:00Z (22:30 UTC)
      const nowNight = new Date('2026-08-16T22:30:00Z');
      // 2026-08-16T12:00:00Z (12:00 UTC)
      const nowDay = new Date('2026-08-16T12:00:00Z');

      const config = {
        syncEnabled: true,
        syncTimeRangeEnabled: true,
        syncStartTime: '22:00',
        syncEndTime: '06:00',
        syncTimezone: 'UTC',
      };

      expect(service.isWithinSyncWindow(config, nowNight)).toBe(true);
      expect(service.isWithinSyncWindow(config, nowDay)).toBe(false);
    });

    it('should filter by active days of week', () => {
      // 2026-08-16 is a Sunday (day 0)
      const sunday = new Date('2026-08-16T12:00:00Z');

      const weekdaysOnly = service.isWithinSyncWindow(
        {
          syncEnabled: true,
          syncTimeRangeEnabled: true,
          syncStartTime: '08:00',
          syncEndTime: '22:00',
          syncDays: [1, 2, 3, 4, 5], // Mon-Fri
          syncTimezone: 'UTC',
        },
        sunday,
      );
      expect(weekdaysOnly).toBe(false);

      const allDays = service.isWithinSyncWindow(
        {
          syncEnabled: true,
          syncTimeRangeEnabled: true,
          syncStartTime: '08:00',
          syncEndTime: '22:00',
          syncDays: [0, 1, 2, 3, 4, 5, 6],
          syncTimezone: 'UTC',
        },
        sunday,
      );
      expect(allDays).toBe(true);
    });
  });
});
