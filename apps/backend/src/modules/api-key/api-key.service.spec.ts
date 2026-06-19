import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { PrismaService } from '../../providers/database/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-mock-key'),
}));

import * as bcrypt from 'bcrypt';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  const mockPrismaClient = {
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  describe('createKey', () => {
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

      const result = await service.createKey('user-456', 'Production Key');

      expect(mockPrismaClient.apiKey.create).toHaveBeenCalledWith({
        data: {
          name: 'Production Key',
          keyPrefix: expect.any(String),
          keyHash: 'hashed-mock-key',
          userId: 'user-456',
        },
      });
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(result.id).toBe('key-123');
      expect(result.key).toBeDefined(); // raw key returned
    });
  });

  describe('findAllKeysByUser', () => {
    it('should return all api keys formatted for the user', async () => {
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

      const result = await service.findAllKeysByUser('user-456');

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

  describe('regenerateKey', () => {
    it('should throw NotFoundException if key does not exist or user does not own it', async () => {
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.regenerateKey('key-1', 'user-456')).rejects.toThrow(NotFoundException);
    });

    it('should generate new key, hash, and update entry if owner requests it', async () => {
      const existingKey = { id: 'key-1', userId: 'user-456', name: 'Key 1' };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);
      
      const updatedKey = { id: 'key-1', userId: 'user-456', name: 'Key 1', keyPrefix: 'new-prefix', keyHash: 'new-hash' };
      mockPrismaClient.apiKey.update.mockResolvedValue(updatedKey);
      
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-mock-key');

      const result = await service.regenerateKey('key-1', 'user-456');

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

  describe('deleteKey', () => {
    it('should throw NotFoundException if key does not exist or user does not own it', async () => {
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.deleteKey('key-1', 'user-456')).rejects.toThrow(NotFoundException);
    });

    it('should successfully delete if owner requests it', async () => {
      const existingKey = { id: 'key-1', userId: 'user-456' };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);
      mockPrismaClient.apiKey.delete.mockResolvedValue({});

      const result = await service.deleteKey('key-1', 'user-456');

      expect(mockPrismaClient.apiKey.delete).toHaveBeenCalledWith({
        where: { id: 'key-1' },
      });
      expect(result).toEqual({ message: 'API Key deleted successfully' });
    });

    it('should throw InternalServerErrorException if delete query fails', async () => {
      const existingKey = { id: 'key-1', userId: 'user-456' };
      mockPrismaClient.apiKey.findFirst.mockResolvedValue(existingKey);
      mockPrismaClient.apiKey.delete.mockRejectedValue(new Error('DB connection failed'));

      await expect(service.deleteKey('key-1', 'user-456')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
