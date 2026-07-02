import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';
import type {
  CreateUserDto,
  PrivacySettingsDto,
  UpdateUserDto,
  UpdateSettingsDto,
  EnableTotpDto,
  EnableEmailMfaDto,
  VerifyPasskeyDto,
} from './user.dto';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserService = {
  create: jest.fn(),
  getPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
  findByUsername: jest.fn(),
  findByEmail: jest.fn(),
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
  getDevices: jest.fn(),
  deleteDevice: jest.fn(),
  registerDevice: jest.fn(),
  getDeviceStatus: jest.fn(),
  getE2eeKeys: jest.fn(),
  updateE2eeKeys: jest.fn(),
};

const mockAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

// Helper to create a typed mock request
function mockReq(partial: { id?: string; username?: string }): ExtendedRequest {
  return { user: { id: partial.id ?? 'user-1', username: partial.username ?? 'testuser', permissions: [] } } as unknown as ExtendedRequest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;
  let reflector: Reflector;

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

  // --- @Public() decorator checks ---
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

  // --- POST /users ---
  describe('create', () => {
    it('should create user', async () => {
      const dto: CreateUserDto = {
        username: 'testuser',
        email: 'test@runa.com',
        password: 'Password123!@#456',
      };
      const expected = { id: 'user-1', ...dto };
      mockUserService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // --- GET /users/me/privacy ---
  describe('getPrivacy', () => {
    it('should call getPrivacySettings with the authenticated user username', async () => {
      const req = mockReq({ username: 'testuser' });
      mockUserService.getPrivacySettings.mockResolvedValue({ profile: false });

      const result = await controller.getPrivacy(req);
      expect(service.getPrivacySettings).toHaveBeenCalledWith('testuser');
      expect(result).toEqual({ profile: false });
    });
  });

  // --- PUT /users/me/privacy ---
  describe('updatePrivacy', () => {
    it('should update privacy settings', async () => {
      const req = mockReq({ id: 'user-1' });
      const dto: PrivacySettingsDto = { profile: true };
      mockUserService.updatePrivacySettings.mockResolvedValue({ success: true });

      const result = await controller.updatePrivacy(req, dto);
      expect(service.updatePrivacySettings).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ success: true });
    });
  });

  // --- PUT /users/me/settings ---
  describe('updateSettings', () => {
    it('should update profile settings', async () => {
      const req = mockReq({ id: 'user-1' });
      const dto: UpdateSettingsDto = { profileSettings: { theme: 'dark' } };
      mockUserService.updateSettings.mockResolvedValue({ id: 'user-1', profileSettings: { theme: 'dark' } });

      const result = await controller.updateSettings(req, dto);
      expect(service.updateSettings).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ id: 'user-1', profileSettings: { theme: 'dark' } });
    });
  });

  // --- PUT /users/me ---
  describe('update', () => {
    it('should update user info', async () => {
      const req = mockReq({ id: 'user-1' });
      const dto: UpdateUserDto = { displayName: 'New Name' };
      mockUserService.update.mockResolvedValue({ id: 'user-1', displayName: 'New Name' });

      const result = await controller.update(req, dto);
      expect(service.update).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ id: 'user-1', displayName: 'New Name' });
    });
  });

  // --- GET /users/:username ---
  describe('findOne', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUserService.findByUsername.mockResolvedValue(null);
      await expect(
        controller.findOne({ username: 'nonexistent' }),
      ).rejects.toThrow(new NotFoundException('User with username nonexistent not found'));
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
            provider: 'ANILIST',
            linkedUsername: 'ani',
            linkedTo: 'user-1',
            private: false,
            metadata: null,
          },
          {
            id: 'c-2',
            provider: 'MAL',
            linkedUsername: 'mal-user',
            linkedTo: 'user-1',
            private: true,
            metadata: null,
          },
        ],
      };
      mockUserService.findByUsername.mockResolvedValue(dbUser);

      const result = await controller.findOne({ username: 'testuser' });

      expect(service.findByUsername).toHaveBeenCalledWith('testuser');
      expect(result.id).toBe('user-1');
      expect(result.connections.length).toBe(1); // private connection is hidden
      expect(result.connections[0].id).toBe('c-1');
    });
  });

  // --- GET /users/by-email/:email ---
  describe('findByEmail', () => {
    it('should throw NotFoundException if user not found by email', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      await expect(
        controller.findByEmail({ email: 'nobody@runa.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return search entity when user found', async () => {
      const user = {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test',
        avatarUrl: null,
        bannerUrl: null,
      };
      mockUserService.findByEmail.mockResolvedValue(user);

      const result = await controller.findByEmail({ email: 'test@runa.com' });
      expect(result.id).toBe('user-1');
      expect(result.username).toBe('testuser');
    });
  });

  // --- MFA & Passkey Endpoints ---
  describe('MFA & Passkey Endpoints', () => {
    const req = mockReq({ id: 'user-1' });

    it('setupTotp should call generateTotpSetup', async () => {
      mockUserService.generateTotpSetup.mockResolvedValue({ secret: 'sec', otpauthUrl: 'url' });
      const result = await controller.setupTotp(req);
      expect(service.generateTotpSetup).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ secret: 'sec', otpauthUrl: 'url' });
    });

    it('enableTotp should call enableTotp', async () => {
      mockUserService.enableTotp.mockResolvedValue([]);
      const dto: EnableTotpDto = { code: '123456' };
      const result = await controller.enableTotp(req, dto);
      expect(service.enableTotp).toHaveBeenCalledWith('user-1', '123456');
      expect(result).toEqual([]);
    });

    it('disableTotp should call disableTotp', async () => {
      mockUserService.disableTotp.mockResolvedValue({ success: true });
      const result = await controller.disableTotp(req);
      expect(service.disableTotp).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('sendEmailMfaSetupCode should call sendEmailMfaSetupCode', async () => {
      mockUserService.sendEmailMfaSetupCode.mockResolvedValue({ success: true });
      const result = await controller.sendEmailMfaSetupCode(req);
      expect(service.sendEmailMfaSetupCode).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('enableEmailMfa should call enableEmailMfa', async () => {
      mockUserService.enableEmailMfa.mockResolvedValue([]);
      const dto: EnableEmailMfaDto = { code: '123456' };
      const result = await controller.enableEmailMfa(req, dto);
      expect(service.enableEmailMfa).toHaveBeenCalledWith('user-1', '123456');
      expect(result).toEqual([]);
    });

    it('disableEmailMfa should call disableEmailMfa', async () => {
      mockUserService.disableEmailMfa.mockResolvedValue({ success: true });
      const result = await controller.disableEmailMfa(req);
      expect(service.disableEmailMfa).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });

    it('regenerateBackupCodes should call regenerateBackupCodes', async () => {
      mockUserService.regenerateBackupCodes.mockResolvedValue([]);
      const result = await controller.regenerateBackupCodes(req);
      expect(service.regenerateBackupCodes).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });

    it('generatePasskeyRegisterOptions should call generatePasskeyRegisterOptions', async () => {
      mockUserService.generatePasskeyRegisterOptions.mockResolvedValue({});
      const result = await controller.generatePasskeyRegisterOptions(req);
      expect(service.generatePasskeyRegisterOptions).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({});
    });

    it('verifyPasskeyRegister should call verifyPasskeyRegister', async () => {
      mockUserService.verifyPasskeyRegister.mockResolvedValue([]);
      const dto: VerifyPasskeyDto = { response: { id: 'cred', rawId: 'raw', type: 'public-key', response: {} } as Record<string, unknown>, name: 'mykey' };
      const result = await controller.verifyPasskeyRegister(req, dto);
      expect(service.verifyPasskeyRegister).toHaveBeenCalledWith('user-1', dto.response, 'mykey');
      expect(result).toEqual([]);
    });

    it('getPasskeys should call getPasskeys', async () => {
      mockUserService.getPasskeys.mockResolvedValue([]);
      const result = await controller.getPasskeys(req);
      expect(service.getPasskeys).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });

    it('getMfaStatus should call getMfaStatus', async () => {
      mockUserService.getMfaStatus.mockResolvedValue({ totpEnabled: true });
      const result = await controller.getMfaStatus(req);
      expect(service.getMfaStatus).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ totpEnabled: true });
    });

    it('deletePasskey should call deletePasskey', async () => {
      mockUserService.deletePasskey.mockResolvedValue({ success: true });
      const result = await controller.deletePasskey(req, { id: 'pass-1' });
      expect(service.deletePasskey).toHaveBeenCalledWith('user-1', 'pass-1');
      expect(result).toEqual({ success: true });
    });
  });
});
