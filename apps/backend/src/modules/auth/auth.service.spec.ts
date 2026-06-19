import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { MailService } from '../../providers/mail/mail.service';
import { jwtVerify } from 'jose';
import * as bcrypt from 'bcrypt';
import * as otplib from 'otplib';
import * as simpleWebAuthn from '@simplewebauthn/server';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../../common/utils/crypto', () => ({
  decrypt: jest.fn().mockReturnValue('decrypted-secret-key'),
  encrypt: jest.fn().mockReturnValue('encrypted:secret:key'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let cacheService: CacheService;
  let mailService: MailService;

  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passkey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    cacheService = module.get<CacheService>(CacheService);
    mailService = module.get<MailService>(MailService);
  });

  describe('login', () => {
    it('should throw BadRequestException if identifier is missing', async () => {
      await expect(service.login({ identifier: '', password: '123' })).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      await expect(service.login({ identifier: 'nonexistent', password: '123' })).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate user and return token on correct password (no MFA active)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed-pw',
        permissions: [1],
        passkeys: [],
        totpEnabled: false,
        emailMfaEnabled: false,
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ identifier: 'testuser', password: 'password' });

      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException on incorrect password', async () => {
      const mockUser = { id: 'user-1', passwordHash: 'hash', passkeys: [] };
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ identifier: 'testuser', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('should return MFA required and tempToken if TOTP MFA is active', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed-pw',
        passkeys: [],
        totpEnabled: true,
        emailMfaEnabled: false,
        backupCodes: [],
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ identifier: 'testuser', password: 'password' });

      expect(result).toEqual({
        mfaRequired: true,
        allowedMethods: ['totp'],
        tempToken: 'mocked-jwt-token',
      });
    });

    it('should login with valid mfaSuccessToken', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { type: 'mfa_success', sub: 'user-1' },
      });

      const mockUser = { id: 'user-1', email: 'test@example.com', username: 'testuser' };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({ mfaSuccessToken: 'valid-success-token' });

      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.id).toBe('user-1');
    });
  });

  describe('sendMfaEmailCode', () => {
    it('should verify tempToken, generate random code, save to cache, and send email', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { type: 'mfa_pending', sub: 'user-1' },
      });

      const mockUser = { id: 'user-1', email: 'test@example.com', emailMfaEnabled: true };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.sendMfaEmailCode('temp-token');

      expect(result).toEqual({ success: true });
      expect(cacheService.set).toHaveBeenCalledWith(expect.stringContaining('mfa-email-code:user-1'), expect.any(String), 300);
      expect(mailService.sendMail).toHaveBeenCalledWith('test@example.com', expect.any(String), expect.any(String));
    });
  });

  describe('verifyMfa', () => {
    it('should verify TOTP code successfully', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { type: 'mfa_pending', sub: 'user-1' },
      });

      const mockUser = { id: 'user-1', totpEnabled: true, totpSecret: 'encrypted-secret', passkeys: [] };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (otplib.verify as jest.Mock).mockResolvedValue({ valid: true });

      const result = await service.verifyMfa('temp-token', 'totp', '123456');

      expect(result.success).toBe(true);
      expect(result.mfaSuccessToken).toBe('mocked-jwt-token');
    });

    it('should verify Email MFA code successfully', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { type: 'mfa_pending', sub: 'user-1' },
      });

      const mockUser = { id: 'user-1', emailMfaEnabled: true, passkeys: [] };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockCacheService.get.mockResolvedValue('654321');

      const result = await service.verifyMfa('temp-token', 'email', '654321');

      expect(result.success).toBe(true);
      expect(cacheService.del).toHaveBeenCalledWith('mfa-email-code:user-1');
    });

    it('should verify backup code successfully', async () => {
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: { type: 'mfa_pending', sub: 'user-1' },
      });

      const mockUser = { id: 'user-1', backupCodes: ['hashed-code-1', 'hashed-code-2'], passkeys: [] };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // matches first code

      const result = await service.verifyMfa('temp-token', 'backup', 'backup-code');

      expect(result.success).toBe(true);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { backupCodes: ['hashed-code-2'] }, // code used and removed
      });
    });
  });

  describe('generatePasskeyLoginOptions', () => {
    it('should return authentication options', async () => {
      const mockOptions = { challenge: 'passkey-challenge' };
      (simpleWebAuthn.generateAuthenticationOptions as jest.Mock).mockResolvedValue(mockOptions);

      const mockUser = { id: 'user-1', email: 'test@example.com', passkeys: [] };
      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.generatePasskeyLoginOptions('user-1');

      expect(result.options).toBe(mockOptions);
      expect(result.userId).toBe('user-1');
      expect(cacheService.set).toHaveBeenCalledWith('passkey-auth-challenge:user-1', 'passkey-challenge', 300);
    });
  });

  describe('verifyPasskeyLogin', () => {
    it('should verify passkey assertion and return user details with token', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passkeys: [{ id: 'key-id', publicKey: 'pub-key', counter: 0, transports: [] }],
      };

      mockPrismaClient.user.findFirst.mockResolvedValue(mockUser);
      mockCacheService.get.mockResolvedValue('challenge-123');
      (simpleWebAuthn.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 5 },
      });

      const result = await service.verifyPasskeyLogin('testuser', { id: 'key-id', response: {} });

      expect(mockPrismaClient.passkey.update).toHaveBeenCalledWith({
        where: { id: 'key-id' },
        data: { counter: 5 },
      });
      expect(result.token).toBe('mocked-jwt-token');
      expect(result.user.id).toBe('user-1');
    });
  });
});
