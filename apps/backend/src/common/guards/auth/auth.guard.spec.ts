import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CacheService } from '../../../providers/cache/cache.service';
import { prisma } from '@runa/database';
import { jwtVerify } from 'jose';
import bcrypt from 'bcrypt';

jest.mock('@runa/database', () => ({
  prisma: {
    apiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;
  let cacheService: CacheService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get<Reflector>(Reflector);
    cacheService = module.get<CacheService>(CacheService);
  });

  const createMockContext = (
    headers: Record<string, string>,
    url = 'http://127.0.0.1/',
    isPublic = false,
  ) => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(isPublic);

    const req = {
      headers,
      url,
      user: undefined as any,
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    describe('API Key Authentication', () => {
      it('should authenticate successfully with a valid API key', async () => {
        const apiKey = 'testapikey1234567890';
        const context = createMockContext({ 'x-api-key': apiKey });

        const mockRecord = {
          id: 'key-id',
          keyHash: 'hashed-key',
          user: {
            id: 'user-id',
            username: 'testuser',
            permissions: [1, 2],
          },
        };

        (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(mockRecord);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (prisma.apiKey.update as jest.Mock).mockResolvedValue({});

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toEqual({
          id: 'user-id',
          username: 'testuser',
          permissions: [1, 2],
        });
        expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
          where: { keyPrefix: apiKey.slice(0, 16) },
          include: { user: true },
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(apiKey, 'hashed-key');
        expect(prisma.apiKey.update).toHaveBeenCalledWith({
          where: { id: 'key-id' },
          data: expect.any(Object),
        });
      });

      it('should throw UnauthorizedException if API key prefix is not found', async () => {
        const apiKey = 'testapikey1234567890';
        const context = createMockContext({ 'x-api-key': apiKey });

        (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException if API key fails bcrypt compare', async () => {
        const apiKey = 'testapikey1234567890';
        const context = createMockContext({ 'x-api-key': apiKey });

        const mockRecord = {
          id: 'key-id',
          keyHash: 'hashed-key',
          user: { id: 'user-id' },
        };

        (prisma.apiKey.findFirst as jest.Mock).mockResolvedValue(mockRecord);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('Session (JWT) Authentication', () => {
      it('should authenticate successfully with a valid Bearer token', async () => {
        const token = 'valid-jwt-token';
        const context = createMockContext({ authorization: `Bearer ${token}` });

        const mockPayload = {
          sub: 'user-id',
          name: 'testuser',
          email: 'test@example.com',
          iat: 1000,
        };

        (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          passwordChangedAt: null,
          permissions: [3, 4],
        });
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (cacheService.set as jest.Mock).mockResolvedValue({});

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toEqual({
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          permissions: [3, 4],
        });
        expect(jwtVerify).toHaveBeenCalledWith(token, expect.any(Uint8Array), {
          algorithms: ['HS256'],
        });
      });

      it('should authenticate successfully with a token in query parameter', async () => {
        const token = 'valid-query-token';
        const context = createMockContext(
          {},
          `http://127.0.0.1/route?token=${token}`,
        );

        const mockPayload = {
          sub: 'user-id',
          name: 'testuser',
          email: 'test@example.com',
          iat: 1000,
        };

        (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          passwordChangedAt: null,
          permissions: [3, 4],
        });
        (cacheService.get as jest.Mock).mockResolvedValue([3, 4]); // cache hit

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toEqual({
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          permissions: [3, 4],
        });
      });

      it('should throw UnauthorizedException if token expired due to password change', async () => {
        const token = 'valid-token';
        const context = createMockContext({ authorization: `Bearer ${token}` });

        const mockPayload = {
          sub: 'user-id',
          name: 'testuser',
          email: 'test@example.com',
          iat: 1000, // Token issued at 1000
        };

        (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });
        // Password changed at 2000 (after token issuance)
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          passwordChangedAt: new Date(2000 * 1000),
          permissions: [],
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          new UnauthorizedException('Token expired due to password change'),
        );
      });
    });

    describe('Public Routes', () => {
      it('should bypass authentication check if route is marked public and no credentials present', async () => {
        const context = createMockContext({}, 'http://127.0.0.1/', true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toBeUndefined();
      });

      it('should populate req.user if valid credentials are provided on public route', async () => {
        const token = 'valid-jwt-token';
        const context = createMockContext(
          { authorization: `Bearer ${token}` },
          'http://127.0.0.1/',
          true,
        );

        const mockPayload = {
          sub: 'user-id',
          name: 'testuser',
          email: 'test@example.com',
          iat: 1000,
        };

        (jwtVerify as jest.Mock).mockResolvedValue({ payload: mockPayload });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
          passwordChangedAt: null,
          permissions: [5],
        });
        (cacheService.get as jest.Mock).mockResolvedValue([5]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toEqual({
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          permissions: [5],
        });
      });

      it('should succeed even if credentials are invalid on public route (errors suppressed)', async () => {
        const token = 'invalid-jwt-token';
        const context = createMockContext(
          { authorization: `Bearer ${token}` },
          'http://127.0.0.1/',
          true,
        );

        (jwtVerify as jest.Mock).mockRejectedValue(
          new Error('Invalid token signature'),
        );

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        const req = context.switchToHttp().getRequest();
        expect(req.user).toBeUndefined();
      });
    });

    describe('No Credentials', () => {
      it('should throw UnauthorizedException if route is private and no credentials are provided', async () => {
        const context = createMockContext({}, 'http://127.0.0.1/', false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          new UnauthorizedException('No authentication token found'),
        );
      });
    });
  });
});
