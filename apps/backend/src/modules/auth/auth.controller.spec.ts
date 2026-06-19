import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    sendMfaEmailCode: jest.fn(),
    verifyMfa: jest.fn(),
    generatePasskeyLoginOptions: jest.fn(),
    verifyPasskeyLogin: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return response', async () => {
      const loginDto = { identifier: 'user', password: 'password' };
      const expectedResponse = { token: 'mock-token', user: {} as any };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(expectedResponse);
    });
  });

  describe('sendMfaEmailCode', () => {
    it('should call authService.sendMfaEmailCode and return success status', async () => {
      const expectedResponse = { success: true };
      mockAuthService.sendMfaEmailCode.mockResolvedValue(expectedResponse);

      const result = await controller.sendMfaEmailCode('temp-token');

      expect(service.sendMfaEmailCode).toHaveBeenCalledWith('temp-token');
      expect(result).toBe(expectedResponse);
    });
  });

  describe('verifyMfa', () => {
    it('should call authService.verifyMfa and return success token', async () => {
      const expectedResponse = { success: true, mfaSuccessToken: 'success-token' };
      mockAuthService.verifyMfa.mockResolvedValue(expectedResponse);

      const result = await controller.verifyMfa('temp-token', 'totp', '123456');

      expect(service.verifyMfa).toHaveBeenCalledWith('temp-token', 'totp', '123456', undefined);
      expect(result).toBe(expectedResponse);
    });
  });

  describe('generatePasskeyLoginOptions', () => {
    it('should call authService.generatePasskeyLoginOptions', async () => {
      const expectedResponse = { options: {}, userId: 'user-1' };
      mockAuthService.generatePasskeyLoginOptions.mockResolvedValue(expectedResponse);

      const result = await controller.generatePasskeyLoginOptions('user');

      expect(service.generatePasskeyLoginOptions).toHaveBeenCalledWith('user');
      expect(result).toBe(expectedResponse);
    });
  });

  describe('verifyPasskeyLogin', () => {
    it('should call authService.verifyPasskeyLogin', async () => {
      const expectedResponse = { token: 'jwt', user: {} as any };
      mockAuthService.verifyPasskeyLogin.mockResolvedValue(expectedResponse);

      const result = await controller.verifyPasskeyLogin('user', { response: 'mock' });

      expect(service.verifyPasskeyLogin).toHaveBeenCalledWith('user', { response: 'mock' });
      expect(result).toBe(expectedResponse);
    });
  });
});
