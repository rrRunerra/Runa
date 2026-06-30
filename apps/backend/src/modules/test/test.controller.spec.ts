import { Test, TestingModule } from '@nestjs/testing';
import { TestController } from './test.controller';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('TestController', () => {
  let controller: TestController;
  let reflector: Reflector;

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [Reflector],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<TestController>(TestController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('noAuth decorator', () => {
    it('should have @Public() decorator', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.noAuth);
      expect(isPublic).toBe(true);
    });
  });

  describe('noAuth', () => {
    it('should return a public response regardless of authentication', async () => {
      const result = await controller.noAuth();
      expect(result.message).toContain(
        'public endpoint. No authentication required.',
      );
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('session', () => {
    it('should return user info when authenticated via session', async () => {
      const mockUser = {
        id: 'user-session-1',
        username: 'session_user',
        type: 'session',
      };
      const mockReq = { user: mockUser };

      const result = await controller.session(mockReq);

      expect(result.message).toContain(
        'protected by session/cookie authentication.',
      );
      expect(result.user).toEqual(mockUser);
    });

    it('should throw TypeError or return undefined user when req.user is missing (anonymous/without auth)', async () => {
      const mockReq = {} as any;
      const result = await controller.session(mockReq);
      expect(result.user).toBeUndefined();
    });
  });

  describe('apiKey', () => {
    it('should return user info when authenticated via API Key', async () => {
      const mockUser = {
        id: 'user-apikey-1',
        username: 'apikey_user',
        type: 'api-key',
      };
      const mockReq = { user: mockUser };

      const result = await controller.apiKey(mockReq);

      expect(result.message).toContain('protected by API Key authentication.');
      expect(result.user).toEqual(mockUser);
    });

    it('should return undefined user when req.user is missing (anonymous/without auth)', async () => {
      const mockReq = {} as any;
      const result = await controller.apiKey(mockReq);
      expect(result.user).toBeUndefined();
    });
  });
});
