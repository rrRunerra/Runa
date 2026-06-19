import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let service: ApiKeyService;

  const mockApiKeyService = {
    findAllKeysByUser: jest.fn(),
    createKey: jest.fn(),
    regenerateKey: jest.fn(),
    deleteKey: jest.fn(),
  };

  const mockDualAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        { provide: ApiKeyService, useValue: mockApiKeyService },
        Reflector,
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useValue(mockDualAuthGuard)
      .compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe('findAll', () => {
    it('should retrieve API keys for the authenticated user (session/token)', async () => {
      const mockReq = { user: { id: 'user-123' } };
      const expectedKeys = [{ id: 'key-1', name: 'Test Key', truncatedKey: 'abc...' }];
      mockApiKeyService.findAllKeysByUser.mockResolvedValue(expectedKeys);

      const result = await controller.findAll(mockReq);

      expect(service.findAllKeysByUser).toHaveBeenCalledWith('user-123');
      expect(result).toBe(expectedKeys);
    });
  });

  describe('create', () => {
    it('should generate a new API key for the authenticated user', async () => {
      const mockReq = { user: { id: 'user-123' } };
      const createDto = { name: 'New Key' };
      const expectedResult = { id: 'key-2', name: 'New Key', key: 'raw-key-value' };
      mockApiKeyService.createKey.mockResolvedValue(expectedResult);

      const result = await controller.create(mockReq, createDto);

      expect(service.createKey).toHaveBeenCalledWith('user-123', 'New Key');
      expect(result).toBe(expectedResult);
    });
  });

  describe('regenerate', () => {
    it('should regenerate the key when requested by the owner', async () => {
      const mockReq = { user: { id: 'user-123' } };
      const regenerateDto = { id: 'key-1' };
      const expectedResult = { id: 'key-1', name: 'Test Key', key: 'new-raw-key' };
      mockApiKeyService.regenerateKey.mockResolvedValue(expectedResult);

      const result = await controller.regenerate(mockReq, regenerateDto);

      expect(service.regenerateKey).toHaveBeenCalledWith('key-1', 'user-123');
      expect(result).toBe(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete the API key when requested by the owner', async () => {
      const mockReq = { user: { id: 'user-123' } };
      const expectedResult = { message: 'API Key deleted successfully' };
      mockApiKeyService.deleteKey.mockResolvedValue(expectedResult);

      const result = await controller.remove(mockReq, 'key-1');

      expect(service.deleteKey).toHaveBeenCalledWith('key-1', 'user-123');
      expect(result).toBe(expectedResult);
    });
  });
});
