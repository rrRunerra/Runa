import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmailAccountService } from './email-account.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { resolveMx } from 'dns/promises';
import { encrypt } from '../../common/utils/crypto';
import { NotificationGateway } from '../notification/notification.gateway';

jest.mock('dns/promises', () => ({
  resolveMx: jest.fn(),
}));

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

const mockMessageDelete = jest.fn().mockResolvedValue(true);
const mockMessageMove = jest.fn().mockResolvedValue(true);
jest.mock('imapflow', () => ({
  ImapFlow: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    list: jest.fn().mockResolvedValue([
      { path: 'INBOX', specialUse: '\\Inbox' },
      { path: 'Trash', specialUse: '\\Trash' },
    ]),
    getMailboxLock: jest.fn().mockResolvedValue({
      release: jest.fn(),
    }),
    messageDelete: mockMessageDelete,
    messageMove: mockMessageMove,
    logout: jest.fn().mockResolvedValue(true),
  })),
}));

describe('EmailAccountService', () => {
  let service: EmailAccountService;
  let mockFetch: jest.Mock;
  let deleteRemoteSpy: jest.SpyInstance;

  const mockPrismaClient = {
    userEmailAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    emailMessage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailAccountService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    service = module.get<EmailAccountService>(EmailAccountService);
    deleteRemoteSpy = jest.spyOn(service as any, 'deleteRemoteMessages').mockResolvedValue(undefined);
  });

  describe('getEmailAccounts', () => {
    it('should retrieve list of email accounts', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          accountName: 'Test Account',
          emailAddress: 'test@example.com',
          imapHost: 'imap.example.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.example.com',
          smtpPort: 465,
          smtpSecure: true,
          encryptedPassword: 'encrypted:pass',
          encryptionIv: 'encrypted',
        },
      ];
      mockPrismaClient.userEmailAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getEmailAccounts('testuser');

      expect(mockPrismaClient.userEmailAccount.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result[0].id).toBe('acc-1');
      expect(result[0].password).toBeDefined();
    });
  });

  describe('addEmailAccount', () => {
    it('should create new email account', async () => {
      const payload = {
        accountName: 'New Acc',
        senderName: 'Test',
        emailAddress: 'test@runerra.org',
        imapHost: 'imap.runerra.org',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.runerra.org',
        smtpPort: 465,
        smtpSecure: true,
        password: 'super-password',
      };

      mockPrismaClient.userEmailAccount.create.mockResolvedValue({ id: 'acc-new', ...payload });

      const result = await service.addEmailAccount('testuser', payload);

      expect(mockPrismaClient.userEmailAccount.create).toHaveBeenCalled();
      expect(result.id).toBe('acc-new');
    });
  });

  describe('updateEmailAccount', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.updateEmailAccount('testuser', 'acc-non', {
          accountName: 'Acc',
          senderName: 'Name',
          emailAddress: 'e@mail.com',
          imapHost: 'imap.com',
          imapPort: 993,
          imapSecure: true,
          smtpHost: 'smtp.com',
          smtpPort: 465,
          smtpSecure: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update account details', async () => {
      const account = { id: 'acc-1', username: 'testuser', accountName: 'Old Name' };
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(account);
      mockPrismaClient.userEmailAccount.update.mockResolvedValue({ ...account, accountName: 'New Name' });

      const result = await service.updateEmailAccount('testuser', 'acc-1', {
        accountName: 'New Name',
        senderName: 'Name',
        emailAddress: 'e@mail.com',
        imapHost: 'imap.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.com',
        smtpPort: 465,
        smtpSecure: true,
      });

      expect(mockPrismaClient.userEmailAccount.update).toHaveBeenCalled();
      expect(result.accountName).toBe('New Name');
    });
  });

  describe('deleteEmailAccount', () => {
    it('should delete existing account', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
      mockPrismaClient.userEmailAccount.delete.mockResolvedValue({});

      const result = await service.deleteEmailAccount('testuser', 'acc-1');

      expect(mockPrismaClient.userEmailAccount.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('fetchEmailAutoconfig', () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="example.com">
    <incomingServer type="imap">
      <hostname>imap.customprovider.net</hostname>
      <port>993</port>
      <socketType>SSL</socketType>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>smtp.customprovider.net</hostname>
      <port>465</port>
      <socketType>SSL</socketType>
    </outgoingServer>
  </emailProvider>
</clientConfig>`;

    it('should auto fill settings using Thunderbird autoconfig if available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockXml,
      });

      const result = await service.fetchEmailAutoconfig('example.com');

      expect(mockFetch).toHaveBeenCalledWith('https://autoconfig.thunderbird.net/v1.1/example.com');
      expect(result).toEqual({
        imapHost: 'imap.customprovider.net',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.customprovider.net',
        smtpPort: 465,
        smtpSecure: true,
      });
    });

    it('should fall back to Google Workspace settings if ISPDB fails and MX records point to google', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      (resolveMx as jest.Mock).mockResolvedValue([
        { exchange: 'aspmx.l.google.com', priority: 10 },
      ]);

      const result = await service.fetchEmailAutoconfig('customgoogle.com');

      expect(result).toEqual({
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      });
    });

    it('should fall back to Office 365 settings if ISPDB fails and MX records point to outlook', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      (resolveMx as jest.Mock).mockResolvedValue([
        { exchange: 'runerra-org.mail.protection.outlook.com', priority: 10 },
      ]);

      const result = await service.fetchEmailAutoconfig('customoutlook.com');

      expect(result).toEqual({
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpSecure: false,
      });
    });

    it('should fall back to default guess settings if both ISPDB and MX lookups yield no match', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      (resolveMx as jest.Mock).mockResolvedValue([
        { exchange: 'mx.unknownisp.net', priority: 10 },
      ]);

      const result = await service.fetchEmailAutoconfig('unknownisp.net');

      expect(result).toEqual({
        imapHost: 'imap.unknownisp.net',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.unknownisp.net',
        smtpPort: 465,
        smtpSecure: true,
      });
    });
  });

  describe('sendEmail', () => {
    it('should throw NotFoundException if email account is not found', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.sendEmail('testuser', 'acc-non', {
          to: 'recipient@example.com',
          subject: 'Hello',
          body: 'World',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully send an email and save it in database', async () => {
      const account = {
        id: 'acc-1',
        username: 'testuser',
        emailAddress: 'sender@example.com',
        senderName: 'Test Sender',
        encryptedPassword: encrypt('password'),
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpSecure: true,
      };

      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(account);
      mockSendMail.mockResolvedValue({ messageId: 'message-id-123' });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({ uid: 10 });
      mockPrismaClient.emailMessage.create.mockImplementation((args) => Promise.resolve({ id: 'msg-new', ...args.data }));

      const result = await service.sendEmail('testuser', 'acc-1', {
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        subject: 'Hello',
        body: 'World content',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test Sender" <sender@example.com>',
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        subject: 'Hello',
        text: 'World content',
        html: 'World content',
      });

      expect(mockPrismaClient.emailMessage.create).toHaveBeenCalledWith({
        data: {
          userEmailAccountId: 'acc-1',
          uid: 11,
          messageId: 'message-id-123',
          subject: 'Hello',
          from: '"Test Sender" <sender@example.com>',
          to: 'recipient@example.com',
          cc: 'cc@example.com',
          date: expect.any(Date),
          bodyText: 'World content',
          bodyHtml: 'World content',
          read: true,
          folder: 'sent',
        },
      });

      expect(result.id).toBe('msg-new');
      expect(result.uid).toBe(11);
    });

    it('should throw an error if sending SMTP email fails', async () => {
      const account = {
        id: 'acc-1',
        username: 'testuser',
        emailAddress: 'sender@example.com',
        encryptedPassword: encrypt('password'),
        smtpHost: 'smtp.example.com',
        smtpPort: 465,
        smtpSecure: true,
      };

      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(account);
      mockSendMail.mockRejectedValue(new Error('SMTP Auth error'));

      await expect(
        service.sendEmail('testuser', 'acc-1', {
          to: 'recipient@example.com',
          subject: 'Hello',
          body: 'World',
        }),
      ).rejects.toThrow('Failed to send email via SMTP: SMTP Auth error');
    });
  });

  describe('deleteMessage', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMessage('testuser', 'acc-non', 'msg-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMessage('testuser', 'acc-1', 'msg-non'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete message directly if it is already in trash', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        encryptedPassword: encrypt('password'),
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        emailAddress: 'test@example.com',
      });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        folder: 'trash',
        uid: 42,
      });
      mockPrismaClient.emailMessage.delete.mockResolvedValue({ id: 'msg-1' });

      const result = await service.deleteMessage('testuser', 'acc-1', 'msg-1');

      expect(mockPrismaClient.emailMessage.delete).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
      });
      expect(deleteRemoteSpy).toHaveBeenCalledWith(
        expect.any(Object),
        [{ folder: 'trash', uids: [42] }]
      );
      expect(result).toEqual({ success: true });
    });

    it('should delete any conflicting messages in trash and update folder to trash if it is in another folder', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        encryptedPassword: encrypt('password'),
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        emailAddress: 'test@example.com',
      });
      mockPrismaClient.emailMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        folder: 'inbox',
        uid: 42,
      });
      mockPrismaClient.emailMessage.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.emailMessage.update.mockResolvedValue({ id: 'msg-1', folder: 'trash' });

      const result = await service.deleteMessage('testuser', 'acc-1', 'msg-1');

      expect(mockPrismaClient.emailMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          userEmailAccountId: 'acc-1',
          folder: 'trash',
          uid: 42,
        },
      });
      expect(mockPrismaClient.emailMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { folder: 'trash' },
      });
      expect(deleteRemoteSpy).toHaveBeenCalledWith(
        expect.any(Object),
        [{ folder: 'inbox', uids: [42] }]
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('bulkUpdateMessageStatus', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.bulkUpdateMessageStatus('testuser', 'acc-non', ['msg-1'], { read: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update multiple messages successfully', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({ id: 'acc-1' });
      mockPrismaClient.emailMessage.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkUpdateMessageStatus('testuser', 'acc-1', ['msg-1', 'msg-2'], {
        read: true,
        flagged: false,
      });

      expect(mockPrismaClient.emailMessage.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['msg-1', 'msg-2'] },
          userEmailAccountId: 'acc-1',
        },
        data: {
          read: true,
          flagged: false,
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('bulkDeleteMessages', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.bulkDeleteMessages('testuser', 'acc-non', ['msg-1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should permanently delete trash messages and move non-trash messages to trash', async () => {
      mockPrismaClient.userEmailAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        encryptedPassword: encrypt('password'),
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        emailAddress: 'test@example.com',
      });
      mockPrismaClient.emailMessage.findMany.mockResolvedValue([
        { id: 'msg-1', folder: 'trash', uid: 101 },
        { id: 'msg-2', folder: 'inbox', uid: 102 },
      ]);
      mockPrismaClient.emailMessage.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.emailMessage.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.bulkDeleteMessages('testuser', 'acc-1', ['msg-1', 'msg-2']);

      // Should delete permanently msg-1 which was in trash
      expect(mockPrismaClient.emailMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['msg-1'] },
        },
      });

      // Should clear conflicting uid 102 in trash before moving msg-2
      expect(mockPrismaClient.emailMessage.deleteMany).toHaveBeenCalledWith({
        where: {
          userEmailAccountId: 'acc-1',
          folder: 'trash',
          uid: { in: [102] },
        },
      });

      // Should update folder to trash for msg-2
      expect(mockPrismaClient.emailMessage.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['msg-2'] },
        },
        data: { folder: 'trash' },
      });

      expect(deleteRemoteSpy).toHaveBeenCalledWith(
        expect.any(Object),
        [
          { folder: 'trash', uids: [101] },
          { folder: 'inbox', uids: [102] }
        ]
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteRemoteMessages (private helper)', () => {
    it('should connect to IMAP, map folders, lock mailboxes and delete/move messages', async () => {
      const mockAccount = {
        encryptedPassword: encrypt('password'),
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
        emailAddress: 'test@example.com',
      };

      // Restore spy for this test to test the real implementation of deleteRemoteMessages
      deleteRemoteSpy.mockRestore();

      await (service as any).deleteRemoteMessages(mockAccount, [
        { folder: 'trash', uids: [101] },
        { folder: 'inbox', uids: [102] },
      ]);

      expect(mockMessageDelete).toHaveBeenCalledWith('101', { uid: true });
      expect(mockMessageMove).toHaveBeenCalledWith('102', 'Trash', { uid: true });
    });
  });
});
