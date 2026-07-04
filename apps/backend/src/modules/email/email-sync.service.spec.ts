import { Test, TestingModule } from '@nestjs/testing';
import { EmailSyncService } from './email-sync.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';

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
      search: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
