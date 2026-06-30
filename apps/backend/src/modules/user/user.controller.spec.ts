import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;
  let reflector: Reflector;

  const mockUserService = {
    create: jest.fn(),
    getPrivacySettings: jest.fn(),
    updatePrivacySettings: jest.fn(),
    findByUsername: jest.fn(),
    updateSettings: jest.fn(),
    update: jest.fn(),
    generateTotpSetup: jest.fn(),
    enableTotp: jest.fn(),
    disableTotp: jest.fn(),
    sendEmailMfaSetupCode: jest.fn(),
    enableEmailMfa: jest.fn(),
    disableEmailMfa: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    generatePasskeyRegisterOptions: jest.fn(),
    verifyPasskeyRegister: jest.fn(),
    getPasskeys: jest.fn(),
    getMfaStatus: jest.fn(),
    deletePasskey: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('public decorators', () => {
    it('create should have @Public() decorator', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.create);
      expect(isPublic).toBe(true);
    });

    it('findOne should have @Public() decorator', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.findOne);
      expect(isPublic).toBe(true);
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@runa.com',
        password: 'password123',
      };
      const expected = { id: 'user-1', ...dto };
      mockUserService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getPrivacy', () => {
    it('should call getPrivacySettings with session authenticated user', async () => {
      const mockReq = { user: { username: 'testuser', authType: 'session' } };
      mockUserService.getPrivacySettings.mockResolvedValue({ profile: false });

      const result = await controller.getPrivacy(mockReq);
      expect(service.getPrivacySettings).toHaveBeenCalledWith('testuser');
      expect(result).toEqual({ profile: false });
    });

    it('should call getPrivacySettings with API key authenticated user', async () => {
      const mockReq = { user: { username: 'testuser', authType: 'api-key' } };
      mockUserService.getPrivacySettings.mockResolvedValue({ profile: false });

      const result = await controller.getPrivacy(mockReq);
      expect(service.getPrivacySettings).toHaveBeenCalledWith('testuser');
      expect(result).toEqual({ profile: false });
    });

    it('should fail (throw TypeError) without authentication context', async () => {
      const mockReq = {} as any;
      await expect(controller.getPrivacy(mockReq)).rejects.toThrow(TypeError);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);
      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        new NotFoundException('User with username nonexistent not found'),
      );
    });

    it('should return safe public user profile when user exists', async () => {
      const dbUser = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        avatarUrl: 'avatar',
        bannerUrl: 'banner',
        sidebarCardBackgroundUrl: 'bg',
        profileSettings: {},
        privacy: { profile: false },
        connections: [
          {
            id: 'c-1',
            provider: 'anilist',
            linkedUsername: 'ani',
            linkedTo: 'user-1',
            private: false,
          },
          {
            id: 'c-2',
            provider: 'mal',
            linkedUsername: 'mal-user',
            linkedTo: 'user-1',
            private: true,
          },
        ],
      };
      mockUserService.findByUsername.mockResolvedValue(dbUser);

      const result = await controller.findOne('testuser');

      expect(service.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result.id).toBe('user-1');
      expect(result.connections.length).toBe(1); // Hidden private connection
      expect(result.connections[0].id).toBe('c-1');
    });
  });

  describe('updatePrivacy', () => {
    it('should update privacy settings with session auth', async () => {
      const mockReq = { user: { id: 'user-1', authType: 'session' } };
      const dto = { profile: true };
      mockUserService.updatePrivacySettings.mockResolvedValue({
        success: true,
      });

      const result = await controller.updatePrivacy(mockReq, dto);
      expect(service.updatePrivacySettings).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateSettings', () => {
    it('should update profile settings with session auth', async () => {
      const mockReq = { user: { id: 'user-1', authType: 'session' } };
      const profileSettings = { theme: 'dark' };
      mockUserService.updateSettings.mockResolvedValue({
        id: 'user-1',
        profileSettings,
      });

      const result = await controller.updateSettings(mockReq, {
        profileSettings,
      });
      expect(service.updateSettings).toHaveBeenCalledWith(
        'user-1',
        profileSettings,
      );
      expect(result).toEqual({ id: 'user-1', profileSettings });
    });
  });

  describe('update', () => {
    it('should update user info with session auth', async () => {
      const mockReq = { user: { id: 'user-1', authType: 'session' } };
      const dto = { displayName: 'New Name' };
      mockUserService.update.mockResolvedValue({
        id: 'user-1',
        displayName: 'New Name',
      });

      const result = await controller.update(mockReq, dto);
      expect(service.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ id: 'user-1', displayName: 'New Name' });
    });
  });

  describe('MFA & Passkey Endpoints', () => {
    const mockReq = { user: { id: 'user-1' } };

    it('setupTotp should call generateTotpSetup', async () => {
      mockUserService.generateTotpSetup.mockResolvedValue({ secret: 'sec' });
      const result = await controller.setupTotp(mockReq);
      expect(service.generateTotpSetup).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ secret: 'sec' });
    });

    it('enableTotp should call enableTotp', async () => {
      mockUserService.enableTotp.mockResolvedValue([]);
      const result = await controller.enableTotp(mockReq, '123456');
      expect(service.enableTotp).toHaveBeenCalledWith('user-1', '123456');
      expect(result).toEqual([]);
    });

    it('disableTotp should call disableTotp', async () => {
      mockUserService.disableTotp.mockResolvedValue({ success: true });
      const result = await controller.disableTotp(mockReq);
      expect(service.disableTotp).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('sendEmailMfaSetupCode should call sendEmailMfaSetupCode', async () => {
      mockUserService.sendEmailMfaSetupCode.mockResolvedValue({
        success: true,
      });
      const result = await controller.sendEmailMfaSetupCode(mockReq);
      expect(service.sendEmailMfaSetupCode).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('enableEmailMfa should call enableEmailMfa', async () => {
      mockUserService.enableEmailMfa.mockResolvedValue([]);
      const result = await controller.enableEmailMfa(mockReq, '123456');
      expect(service.enableEmailMfa).toHaveBeenCalledWith('user-1', '123456');
      expect(result).toEqual([]);
    });

    it('disableEmailMfa should call disableEmailMfa', async () => {
      mockUserService.disableEmailMfa.mockResolvedValue({ success: true });
      const result = await controller.disableEmailMfa(mockReq);
      expect(service.disableEmailMfa).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('regenerateBackupCodes should call regenerateBackupCodes', async () => {
      mockUserService.regenerateBackupCodes.mockResolvedValue([]);
      const result = await controller.regenerateBackupCodes(mockReq);
      expect(service.regenerateBackupCodes).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });

    it('generatePasskeyRegisterOptions should call generatePasskeyRegisterOptions', async () => {
      mockUserService.generatePasskeyRegisterOptions.mockResolvedValue({});
      const result = await controller.generatePasskeyRegisterOptions(mockReq);
      expect(service.generatePasskeyRegisterOptions).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual({});
    });

    it('verifyPasskeyRegister should call verifyPasskeyRegister', async () => {
      mockUserService.verifyPasskeyRegister.mockResolvedValue([]);
      const result = await controller.verifyPasskeyRegister(
        mockReq,
        'response',
        'name',
      );
      expect(service.verifyPasskeyRegister).toHaveBeenCalledWith(
        'user-1',
        'response',
        'name',
      );
      expect(result).toEqual([]);
    });

    it('getPasskeys should call getPasskeys', async () => {
      mockUserService.getPasskeys.mockResolvedValue([]);
      const result = await controller.getPasskeys(mockReq);
      expect(service.getPasskeys).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });

    it('getMfaStatus should call getMfaStatus', async () => {
      mockUserService.getMfaStatus.mockResolvedValue({ totpEnabled: true });
      const result = await controller.getMfaStatus(mockReq);
      expect(service.getMfaStatus).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ totpEnabled: true });
    });

    it('deletePasskey should call deletePasskey', async () => {
      mockUserService.deletePasskey.mockResolvedValue({ success: true });
      const result = await controller.deletePasskey(mockReq, 'pass-1');
      expect(service.deletePasskey).toHaveBeenCalledWith('user-1', 'pass-1');
      expect(result).toEqual({ success: true });
    });
  });
});
