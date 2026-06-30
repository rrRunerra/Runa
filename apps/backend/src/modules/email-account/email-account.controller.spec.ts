import { Test, TestingModule } from '@nestjs/testing';
import { EmailAccountController } from './email-account.controller';
import { EmailAccountService } from './email-account.service';
import { EmailSyncService } from './email-sync.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('EmailAccountController', () => {
  let controller: EmailAccountController;
  let service: EmailAccountService;
  let syncService: EmailSyncService;

  const mockService = {
    getEmailAccounts: jest.fn(),
    addEmailAccount: jest.fn(),
    updateEmailAccount: jest.fn(),
    deleteEmailAccount: jest.fn(),
    fetchEmailAutoconfig: jest.fn(),
  };

  const mockSyncService = {
    syncAccount: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailAccountController],
      providers: [
        { provide: EmailAccountService, useValue: mockService },
        { provide: EmailSyncService, useValue: mockSyncService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<EmailAccountController>(EmailAccountController);
    service = module.get<EmailAccountService>(EmailAccountService);
    syncService = module.get<EmailSyncService>(EmailSyncService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEmailAccounts', () => {
    it('should return list of email accounts', async () => {
      mockService.getEmailAccounts.mockResolvedValue([]);
      const result = await controller.getEmailAccounts({
        user: { username: 'test' },
      });
      expect(result).toEqual([]);
      expect(mockService.getEmailAccounts).toHaveBeenCalledWith('test');
    });
  });

  describe('addEmailAccount', () => {
    it('should call service addEmailAccount', async () => {
      const payload: any = { accountName: 'Test' };
      mockService.addEmailAccount.mockResolvedValue({ id: '1' });
      const result = await controller.addEmailAccount(
        { user: { username: 'test' } },
        payload,
      );
      expect(result).toEqual({ id: '1' });
      expect(mockService.addEmailAccount).toHaveBeenCalledWith('test', payload);
    });
  });

  describe('updateEmailAccount', () => {
    it('should call service updateEmailAccount', async () => {
      const payload: any = { accountName: 'Test' };
      mockService.updateEmailAccount.mockResolvedValue({ id: '1' });
      const result = await controller.updateEmailAccount(
        { user: { username: 'test' } },
        '1',
        payload,
      );
      expect(result).toEqual({ id: '1' });
      expect(mockService.updateEmailAccount).toHaveBeenCalledWith(
        'test',
        '1',
        payload,
      );
    });
  });

  describe('deleteEmailAccount', () => {
    it('should call service deleteEmailAccount', async () => {
      mockService.deleteEmailAccount.mockResolvedValue({ success: true });
      const result = await controller.deleteEmailAccount(
        { user: { username: 'test' } },
        '1',
      );
      expect(result).toEqual({ success: true });
      expect(mockService.deleteEmailAccount).toHaveBeenCalledWith('test', '1');
    });
  });

  describe('fetchEmailAutoconfig', () => {
    it('should call service fetchEmailAutoconfig', async () => {
      const config = {
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      };
      mockService.fetchEmailAutoconfig.mockResolvedValue(config);
      const result = await controller.fetchEmailAutoconfig('gmail.com');
      expect(result).toEqual(config);
      expect(mockService.fetchEmailAutoconfig).toHaveBeenCalledWith(
        'gmail.com',
      );
    });
  });

  describe('syncEmail', () => {
    it('should call syncAccount on EmailSyncService', async () => {
      mockSyncService.syncAccount.mockResolvedValue(undefined);
      const result = await controller.syncEmail(
        { user: { username: 'test' } },
        'acc-1',
      );
      expect(result).toEqual({ success: true });
      expect(mockSyncService.syncAccount).toHaveBeenCalledWith('acc-1');
    });
  });
});
