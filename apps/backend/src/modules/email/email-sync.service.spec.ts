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
});
