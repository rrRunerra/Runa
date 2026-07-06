import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PrismaService } from '../../providers/database/prisma.service';
import { FilesService } from '../files/files.service';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import bcrypt from 'bcrypt';
import { generateSecret, generateURI, verify } from 'otplib';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

jest.mock('bcrypt');

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let filesService: FilesService;
  let cacheService: CacheService;
  let mailService: MailService;

  const mockPrismaClient = {
    user: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passkey: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    aquilaAnimeUserList: { updateMany: jest.fn() },
    aquilaMangaUserList: { updateMany: jest.fn() },
    aquilaTvUserList: { updateMany: jest.fn() },
    aquilaMovieUserList: { updateMany: jest.fn() },
    connections: { updateMany: jest.fn() },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockFilesService = {
    deleteFileByUrl: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheService.get.mockReset();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockReset();
    mockCacheService.del.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        UserRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FilesService, useValue: mockFilesService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    filesService = module.get<FilesService>(FilesService);
    cacheService = module.get<CacheService>(CacheService);
    mailService = module.get<MailService>(MailService);
  });

  describe('create', () => {
    it('should throw ConflictException if username is reserved keyword', async () => {
      const dto = {
        username: 'class',
        email: 'test@runa.com',
        password: 'password123',
      };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email or username is already taken', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@runa.com',
        password: 'password123',
      };
      mockPrismaClient.user.findFirst.mockResolvedValue({
        username: 'testuser',
        email: 'test@runa.com',
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash password and create new administrator user if it is the first user', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@runa.com',
        password: 'password123',
      };
      mockPrismaClient.user.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.count.mockResolvedValue(0);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue({ id: 'user-1', ...dto });

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
      expect(result.id).toBe('user-1');
    });
  });

  describe('findByUsername', () => {
    it('should lower username and fetch user', async () => {
      const mockUser = { id: 'user-1', username: 'testuser' };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsername('TESTUSER');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: { connections: true },
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update('user-1', { displayName: 'Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update display name and properties', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@runa.com',
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      mockPrismaClient.user.update.mockResolvedValue({
        ...user,
        displayName: 'New Display',
      });

      const result = await service.update('user-1', {
        displayName: 'New Display',
      });

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { displayName: 'New Display' },
      });
      expect(result.displayName).toBe('New Display');
    });

    it('should verify current password and hash new password if updating password', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'old-hashed-pass',
      };
      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pass');
      mockPrismaClient.user.update.mockResolvedValue(user);

      await service.update('user-1', {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldpassword',
        'old-hashed-pass',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
    });

    it('should throw BadRequestException if currentPassword is wrong', async () => {
      const user = { id: 'user-1', passwordHash: 'old-hashed-pass' };
      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.update('user-1', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete old files if url changes', async () => {
      const user = { id: 'user-1', avatarUrl: 'old-avatar.png' };
      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      mockPrismaClient.user.update.mockResolvedValue({
        ...user,
        avatarUrl: 'new-avatar.png',
      });

      await service.update('user-1', { avatarUrl: 'new-avatar.png' });

      expect(filesService.deleteFileByUrl).toHaveBeenCalledWith(
        'old-avatar.png',
      );
    });
  });

  describe('privacy settings', () => {
    it('should throw NotFoundException if user not found in getPrivacySettings', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      await expect(service.getPrivacySettings('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should get parsed privacy settings', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        privacy: { animeList: true },
      });
      const result = await service.getPrivacySettings('testuser');
      expect(result.animeList).toBe(true);
      expect(result.profile).toBe(false);
    });

    it('should update privacy settings and run transactional updates on list tables', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        privacy: {},
      });
      mockPrismaClient.$transaction.mockResolvedValue([]);

      await service.updatePrivacySettings('user-1', {
        animeList: true,
        profile: false,
      });

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('TOTP MFA', () => {
    it('should generate TOTP setup secret and URI, caching secret', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      (generateSecret as jest.Mock).mockReturnValue('totpsecret');
      (generateURI as jest.Mock).mockReturnValue('otpauth://totp/Runa');

      const result = await service.generateTotpSetup('user-1');

      expect(cacheService.set).toHaveBeenCalledWith(
        'pending-totp:user-1',
        'totpsecret',
        600,
      );
      expect(result).toEqual({
        secret: 'totpsecret',
        otpauthUrl: 'otpauth://totp/Runa',
      });
    });

    it('should enable TOTP and generate backup codes if no MFA was active', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        totpEnabled: false,
        emailMfaEnabled: false,
        passkeys: [],
      });
      mockCacheService.get.mockResolvedValue('totpsecret');
      (verify as jest.Mock).mockReturnValue({ valid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup');

      const backupCodes = await service.enableTotp('user-1', '123456');

      expect(backupCodes.length).toBe(10);
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
      expect(cacheService.del).toHaveBeenCalledWith('pending-totp:user-1');
    });

    it('should disable TOTP', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passkeys: [],
      });
      await service.disableTotp('user-1');
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });
  });

  describe('Email MFA', () => {
    it('should send email mfa setup code', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@runa.com',
      });
      const result = await service.sendEmailMfaSetupCode('user-1');

      expect(cacheService.set).toHaveBeenCalledWith(
        'pending-email-mfa:user-1',
        expect.any(String),
        300,
      );
      expect(mailService.sendMail).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should enable email mfa', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passkeys: [],
      });
      mockCacheService.get.mockResolvedValue('654321');

      const backupCodes = await service.enableEmailMfa('user-1', '654321');

      expect(backupCodes.length).toBe(10);
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });

    it('should enable email mfa when cached code is a number', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passkeys: [],
      });
      mockCacheService.get.mockResolvedValue(654321);

      const backupCodes = await service.enableEmailMfa('user-1', '654321');

      expect(backupCodes.length).toBe(10);
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });
  });

  describe('Passkeys / WebAuthn', () => {
    it('should generate registration options', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passkeys: [],
      });
      (generateRegistrationOptions as jest.Mock).mockResolvedValue({
        challenge: 'webauthn-challenge',
      });

      const options = await service.generatePasskeyRegisterOptions('user-1');

      expect(cacheService.set).toHaveBeenCalledWith(
        'passkey-reg-challenge:user-1',
        'webauthn-challenge',
        300,
      );
      expect(options).toEqual({ challenge: 'webauthn-challenge' });
    });

    it('should verify and save passkey registration', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passkeys: [],
      });
      mockCacheService.get.mockResolvedValue('webauthn-challenge');
      (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'cred-1',
            publicKey: new Uint8Array([1, 2]),
            counter: 0,
            transports: ['internal'],
          },
        },
      });

      const backup = await service.verifyPasskeyRegister(
        'user-1',
        { id: 'cred-1' } as never,
        'My PC',
      );

      expect(backup.length).toBe(10);
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should delete passkey and clean up backup codes if no MFA left', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        totpEnabled: false,
        emailMfaEnabled: false,
        passkeys: [{ id: 'pass-1' }],
      });
      mockPrismaClient.passkey.delete.mockResolvedValue({});

      await service.deletePasskey('user-1', 'pass-1');

      expect(mockPrismaClient.passkey.delete).toHaveBeenCalledWith({
        where: { id: 'pass-1' },
      });
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { backupCodes: [] },
      });
    });

    it('should get passkeys list', async () => {
      mockPrismaClient.passkey.findMany.mockResolvedValue([]);
      const result = await service.getPasskeys('user-1');
      expect(result).toEqual([]);
    });

    it('should get MFA status summary', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        totpEnabled: true,
        emailMfaEnabled: false,
        backupCodes: ['code'],
        passkeys: [],
      });
      const status = await service.getMfaStatus('user-1');
      expect(status).toEqual({
        totpEnabled: true,
        emailMfaEnabled: false,
        hasBackupCodes: true,
        passkeysCount: 0,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // API Keys
  // ---------------------------------------------------------------------------

  describe('createApiKey', () => {
    it('should generate, hash, and save a new API key', async () => {
      const mockSavedKey = {
        id: 'key-123',
        name: 'Production Key',
        keyPrefix: 'mock-prefix',
        keyHash: 'mock-hash',
        userId: 'user-456',
        createdAt: new Date(),
      };

      mockPrismaClient.apiKey.create.mockResolvedValue(mockSavedKey);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-mock-key');

      const result = await service.createApiKey('user-456', 'Production Key');

      expect(mockPrismaClient.apiKey.create).toHaveBeenCalledWith({
        data: {
          name: 'Production Key',
          keyPrefix: expect.any(String),
          keyHash: 'hashed-mock-key',
          user: { connect: { id: 'user-456' } },
        },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(result.id).toBe('key-123');
      expect(result.key).toBeDefined();
    });
  });

  describe('findAllApiKeysByUser', () => {
    it('should return all API keys formatted for the user', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Key 1',
          keyPrefix: 'prefix1234567890',
          createdAt: new Date(),
          lastUsedAt: null,
        },
      ];

      mockPrismaClient.apiKey.findMany.mockResolvedValue(mockKeys);

      const result = await service.findAllApiKeysByUser('user-456');

      expect(mockPrismaClient.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'key-1',
          name: 'Key 1',
          createdAt: mockKeys[0].createdAt,
          lastUsedAt: null,
          truncatedKey: 'prefix1234567890...',
        },
      ]);
    });
  });

  describe('regenerateApiKey', () => {
    it('should throw NotFoundException if key does not exist or user does not own it', async () => {
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(null);

      await expect(
        service.regenerateApiKey('key-1', 'user-456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate new key, hash, and update entry if owner requests it', async () => {
      const existingKey = {
        id: 'key-1',
        userId: 'user-456',
        name: 'Key 1',
      };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);

      const updatedKey = {
        id: 'key-1',
        userId: 'user-456',
        name: 'Key 1',
        keyPrefix: 'new-prefix',
        keyHash: 'new-hash',
      };
      mockPrismaClient.apiKey.update.mockResolvedValue(updatedKey);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-mock-key');

      const result = await service.regenerateApiKey('key-1', 'user-456');

      expect(mockPrismaClient.apiKey.findFirst).toHaveBeenCalledWith({
        where: { id: 'key-1', userId: 'user-456' },
      });
      expect(mockPrismaClient.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          keyHash: 'new-hashed-mock-key',
          keyPrefix: expect.any(String),
          lastUsedAt: null,
        },
      });
      expect(result.key).toBeDefined();
    });
  });

  describe('deleteApiKey', () => {
    it('should throw NotFoundException if key does not exist or user does not own it', async () => {
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.deleteApiKey('key-1', 'user-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully delete if owner requests it', async () => {
      const existingKey = { id: 'key-1', userId: 'user-456' };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);
      mockPrismaClient.apiKey.delete.mockResolvedValue({});

      const result = await service.deleteApiKey('key-1', 'user-456');

      expect(mockPrismaClient.apiKey.findFirst).toHaveBeenCalledWith({
        where: { id: 'key-1', userId: 'user-456' },
      });
      expect(mockPrismaClient.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-1' },
      });
      expect(result).toEqual({ message: 'API Key deleted successfully' });
    });

    it('should throw InternalServerErrorException if delete query fails', async () => {
      const existingKey = { id: 'key-1', userId: 'user-456' };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);
      mockPrismaClient.apiKey.delete.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await expect(service.deleteApiKey('key-1', 'user-456')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
