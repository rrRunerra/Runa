import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailSyncService } from './email-sync.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('EmailController', () => {
  let controller: EmailController;
  let service: EmailService;
  let syncService: EmailSyncService;

  const mockEmailService = {
    getEmailAccounts: jest.fn(),
    addEmailAccount: jest.fn(),
    updateEmailAccount: jest.fn(),
    deleteEmailAccount: jest.fn(),
    getCannedResponses: jest.fn(),
    createCannedResponse: jest.fn(),
    updateCannedResponse: jest.fn(),
    deleteCannedResponse: jest.fn(),
    fetchEmailAutoconfig: jest.fn(),
    getUnifiedFolderMessages: jest.fn(),
    getFolderMessages: jest.fn(),
    getMessageDetail: jest.fn(),
    updateMessageStatus: jest.fn(),
    deleteMessage: jest.fn(),
    bulkUpdateMessageStatus: jest.fn(),
    bulkDeleteMessages: jest.fn(),
    sendEmail: jest.fn(),
    getAttachment: jest.fn(),
  };

  const mockEmailSyncService = {
    syncAccount: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        { provide: EmailService, useValue: mockEmailService },
        { provide: EmailSyncService, useValue: mockEmailSyncService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<EmailController>(EmailController);
    service = module.get<EmailService>(EmailService);
    syncService = module.get<EmailSyncService>(EmailSyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEmailAccounts', () => {
    it('should retrieve email accounts using req.user.username', async () => {
      const mockReq = { user: { username: 'john_doe' } };
      mockEmailService.getEmailAccounts.mockResolvedValue([]);

      const result = await controller.getEmailAccounts(mockReq);

      expect(mockEmailService.getEmailAccounts).toHaveBeenCalledWith('john_doe');
      expect(result).toEqual([]);
    });
  });

  describe('fetchEmailAutoconfig', () => {
    it('should fetch autoconfig for domain', async () => {
      mockEmailService.fetchEmailAutoconfig.mockResolvedValue({ imapHost: 'imap.test.com' });

      const result = await controller.fetchEmailAutoconfig('test.com');

      expect(mockEmailService.fetchEmailAutoconfig).toHaveBeenCalledWith('test.com');
      expect(result.imapHost).toBe('imap.test.com');
    });
  });

  describe('syncEmail', () => {
    it('should invoke background sync for account', async () => {
      const mockReq = { user: { username: 'john_doe' } };
      mockEmailSyncService.syncAccount.mockResolvedValue(undefined);

      const result = await controller.syncEmail(mockReq, 'acc-123');

      expect(mockEmailSyncService.syncAccount).toHaveBeenCalledWith('acc-123');
      expect(result).toEqual({ success: true });
    });
  });
});
