import { Test, TestingModule } from '@nestjs/testing';
import { EmailSyncService } from './email-sync.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { simpleParser } from 'mailparser';
import { NotificationGateway } from '../notification/notification.gateway';

jest.mock('imapflow', () => {
  return {
    ImapFlow: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(true),
        list: jest.fn().mockResolvedValue([
          { path: 'INBOX', specialUse: '\\Inbox' },
          { path: 'Sent Mail', specialUse: '\\Sent' },
        ]),
        getMailboxLock: jest.fn().mockResolvedValue({
          release: jest.fn(),
        }),
        search: jest.fn().mockResolvedValue([10]),
        fetch: jest.fn().mockImplementation(async function* () {
          yield {
            uid: 10,
            flags: new Set(['\\Seen']),
            source: Buffer.from('raw RFC822 mail source'),
          };
        }),
        logout: jest.fn().mockResolvedValue(true),
      };
    }),
  };
});

jest.mock('mailparser', () => ({
  simpleParser: jest.fn().mockResolvedValue({
    subject: 'Test Subject',
    from: { text: 'sender@example.com' },
    to: { text: 'receiver@example.com' },
    date: new Date('2026-06-20T00:00:00.000Z'),
    text: 'Body plain text',
    html: '<p>Body HTML</p>',
    messageId: '<msg-123@id>',
    attachments: [
      {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
        size: 1024,
        content: Buffer.from('pdf data'),
      },
    ],
  }),
}));

jest.mock('../../common/utils/crypto', () => ({
  decrypt: jest.fn().mockReturnValue('decrypted-password'),
}));

describe('EmailSyncService', () => {
  let service: EmailSyncService;

  const mockPrismaClient = {
    userEmailAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    emailMessage: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    emailAttachment: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationGateway,
          useValue: {
            sendToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailSyncService>(EmailSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleSyncCron', () => {
    it('should query accounts and check intervals, calling sync if past due', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          emailAddress: 'test@runerra.org',
        },
      ];
      mockPrismaClient.userEmailAccount.findMany.mockResolvedValue(mockAccounts);
      jest.spyOn(service, 'syncAccount').mockResolvedValue();

      await service.handleSyncCron();

      expect(mockPrismaClient.userEmailAccount.findMany).toHaveBeenCalled();
      expect(service.syncAccount).toHaveBeenCalledWith('acc-1');
    });
  });

  describe('syncAccount', () => {
    it('should connect via imapflow, query folders, parse content and cache messages & attachments in DB', async () => {
      const mockAccount = {
        id: 'acc-1',
        emailAddress: 'test@runerra.org',
        encryptedPassword: 'enc:pass',
        imapHost: 'imap.runerra.org',
        imapPort: 993,
        imapSecure: true,
      };

      mockPrismaClient.userEmailAccount.findUnique.mockResolvedValue(mockAccount);
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({ uid: 5 }); // last cached UID is 5
      mockPrismaClient.emailMessage.create.mockResolvedValue({ id: 'msg-rec-1' });

      await service.syncAccount('acc-1');

      expect(mockPrismaClient.userEmailAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
      });
      expect(mockPrismaClient.emailMessage.findFirst).toHaveBeenCalledWith({
        where: { userEmailAccountId: 'acc-1', folder: 'inbox' },
        orderBy: { uid: 'desc' },
        select: { uid: true },
      });

      // Assert that EmailMessage database entry was created for inbox
      expect(mockPrismaClient.emailMessage.create).toHaveBeenCalledWith({
        data: {
          userEmailAccountId: 'acc-1',
          uid: 10,
          messageId: '<msg-123@id>',
          subject: 'Test Subject',
          from: 'sender@example.com',
          to: 'receiver@example.com',
          cc: null,
          bcc: null,
          date: new Date('2026-06-20T00:00:00.000Z'),
          bodyText: 'Body plain text',
          bodyHtml: '<p>Body HTML</p>',
          read: true,
          flagged: false,
          folder: 'inbox',
        },
      });

      // Assert that EmailMessage database entry was created for sent
      expect(mockPrismaClient.emailMessage.create).toHaveBeenCalledWith({
        data: {
          userEmailAccountId: 'acc-1',
          uid: 10,
          messageId: '<msg-123@id>',
          subject: 'Test Subject',
          from: 'sender@example.com',
          to: 'receiver@example.com',
          cc: null,
          bcc: null,
          date: new Date('2026-06-20T00:00:00.000Z'),
          bodyText: 'Body plain text',
          bodyHtml: '<p>Body HTML</p>',
          read: true,
          flagged: false,
          folder: 'sent',
        },
      });

      // Assert that EmailAttachment database entry was created
      expect(mockPrismaClient.emailAttachment.create).toHaveBeenCalledWith({
        data: {
          emailMessageId: 'msg-rec-1',
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
          size: 1024,
          content: expect.any(Buffer),
        },
      });
    });

    it('should create database notification and broadcast websocket event for unread inbox emails', async () => {
      const mockAccount = {
        id: 'acc-1',
        emailAddress: 'test@runerra.org',
        encryptedPassword: 'enc:pass',
        imapHost: 'imap.runerra.org',
        imapPort: 993,
        imapSecure: true,
      };

      const mockFetchGenerator = async function* () {
        yield {
          uid: 10,
          flags: new Set([]), // Empty flags means unread
          source: Buffer.from('raw RFC822 mail source'),
        };
      };

      const { ImapFlow } = require('imapflow');
      ImapFlow.mockImplementationOnce(() => ({
        connect: jest.fn().mockResolvedValue(true),
        list: jest.fn().mockResolvedValue([
          { path: 'INBOX', specialUse: '\\Inbox' },
        ]),
        getMailboxLock: jest.fn().mockResolvedValue({
          release: jest.fn(),
        }),
        search: jest.fn().mockResolvedValue([10]),
        fetch: jest.fn().mockImplementation(mockFetchGenerator),
        logout: jest.fn().mockResolvedValue(true),
      }));

      mockPrismaClient.userEmailAccount.findUnique.mockResolvedValue(mockAccount);
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({ uid: 5 });
      mockPrismaClient.emailMessage.create.mockResolvedValue({
        id: 'msg-rec-1',
        subject: 'Test Subject',
        from: 'sender@example.com',
        read: false,
      });
      mockPrismaClient.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        title: 'Test Subject',
        message: 'New email from sender@example.com',
        type: 'INFO',
        status: 'PENDING',
        metadata: { type: 'email' },
        createdAt: new Date(),
      });

      await service.syncAccount('acc-1');

      expect(mockPrismaClient.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Test Subject',
          message: 'New email from sender@example.com',
          type: 'INFO',
          status: 'PENDING',
          metadata: {
            type: 'email',
            emailAccountId: 'acc-1',
            emailFolder: 'inbox',
            emailMessageId: 'msg-rec-1',
          },
        },
      });
    });
  });
});
