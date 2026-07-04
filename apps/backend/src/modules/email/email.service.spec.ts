import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as cryptoNode from '@runa/crypto/node';
import * as cryptoServer from '@runa/crypto/server';

jest.mock('@runa/crypto/node', () => ({
  generateDataKey: jest.fn(() => Buffer.from('mockKey')),
  encryptWithDataKey: jest.fn((text) => `enc:${text}`),
  encryptBufferWithDataKey: jest.fn((buf) => buf),
  encryptDataKeyForUser: jest.fn(() => 'mockEncKey'),
}));

jest.mock('@runa/crypto/server', () => ({
  encrypt: jest.fn((text) => `enc:${text}`),
  decrypt: jest.fn((text) => text.replace('enc:', '')),
}));

describe('EmailService', () => {
  let service: EmailService;
  let prisma: PrismaService;
  let cache: CacheService;

  const mockPrismaClient = {
    userEmailAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    emailMessage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    cannedResponse: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    emailAttachment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: NotificationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);
  });

  describe('getEmailAccounts', () => {
    it('should retrieve email accounts and decrypt password', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          accountName: 'Personal',
          encryptedPassword: 'enc:secret',
          emailMessages: [],
        },
      ];
      mockPrismaClient.userEmailAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getEmailAccounts('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].password).toBe('secret');
    });
  });

  describe('addEmailAccount', () => {
    it('should encrypt password and save new account', async () => {
      const dto = {
        accountName: 'Work',
        senderName: 'John Doe',
        emailAddress: 'john@example.com',
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpSecure: true,
        password: 'myPassword',
      };
      mockPrismaClient.userEmailAccount.create.mockResolvedValue({ id: 'acc-2' });

      const result = await service.addEmailAccount('user-1', dto);

      expect(mockPrismaClient.userEmailAccount.create).toHaveBeenCalled();
      expect(result.id).toBe('acc-2');
    });
  });

  describe('fetchEmailAutoconfig', () => {
    it('should throw BadRequestException on invalid domain', async () => {
      await expect(service.fetchEmailAutoconfig('invalid_domain_!@#')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return autoconfig mapped for gmail.com', async () => {
      const result = await service.fetchEmailAutoconfig('gmail.com');
      expect(result.imapHost).toBe('imap.gmail.com');
      expect(result.imapPort).toBe(993);
      expect(result.imapSecure).toBe(true);
    });
  });

  describe('getCannedResponses', () => {
    it('should retrieve canned responses sorted by createdAt desc', async () => {
      mockPrismaClient.cannedResponse.findMany.mockResolvedValue([]);
      const result = await service.getCannedResponses('user-1', 1, 10);
      expect(result).toEqual([]);
    });
  });
});
