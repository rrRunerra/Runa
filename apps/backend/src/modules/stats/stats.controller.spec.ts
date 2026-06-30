import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { PrismaService } from '../../providers/database/prisma.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('StatsController', () => {
  let controller: StatsController;

  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    userStats: {
      findUnique: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }, Reflector],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<StatsController>(StatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      const mockReq = { user: undefined };

      await expect(
        controller.getStats('nonexistent', 'anime', mockReq),
      ).rejects.toThrow(new NotFoundException('User nonexistent not found'));
    });

    it('should throw ForbiddenException if profile is private and viewer is anonymous', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { profile: true },
      });
      const mockReq = { user: undefined };

      await expect(
        controller.getStats('testuser', 'anime', mockReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if anime stats are private and viewer is another user (session)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { animeList: true },
      });
      const mockReq = { user: { username: 'otheruser', authType: 'session' } };

      await expect(
        controller.getStats('testuser', 'anime', mockReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if manga stats are private and viewer is another user (api key)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { mangaList: true },
      });
      const mockReq = { user: { username: 'otheruser', authType: 'api-key' } };

      await expect(
        controller.getStats('testuser', 'manga', mockReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should retrieve stats for owner (session auth matching username)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { profile: true },
      });
      const mockStats = { count: 10, meanScore: 8.5 };
      mockPrismaClient.userStats.findUnique.mockResolvedValue({
        statsData: mockStats,
      });
      const mockReq = { user: { username: 'testuser', authType: 'session' } };

      const result = await controller.getStats('testuser', 'anime', mockReq);

      expect(result).toEqual(mockStats);
      expect(mockPrismaClient.userStats.findUnique).toHaveBeenCalledWith({
        where: {
          userId_mediaType: {
            userId: 'user-1',
            mediaType: 'anime',
          },
        },
      });
    });

    it('should retrieve stats for owner (API key auth matching username)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { profile: true },
      });
      const mockStats = { count: 15, meanScore: 7.8 };
      mockPrismaClient.userStats.findUnique.mockResolvedValue({
        statsData: mockStats,
      });
      const mockReq = { user: { username: 'TestUser', authType: 'api-key' } };

      const result = await controller.getStats('testuser', 'manga', mockReq);
      expect(result).toEqual(mockStats);
    });

    it('should retrieve stats for anonymous viewer if list is public', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { profile: false, animeList: false },
      });
      const mockStats = { count: 5, meanScore: 9.0 };
      mockPrismaClient.userStats.findUnique.mockResolvedValue({
        statsData: mockStats,
      });
      const mockReq = { user: undefined };

      const result = await controller.getStats('testuser', 'anime', mockReq);
      expect(result).toEqual(mockStats);
    });

    it('should return default values if stats record is not found in database', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: { profile: false },
      });
      mockPrismaClient.userStats.findUnique.mockResolvedValue(null);
      const mockReq = { user: undefined };

      const result = await controller.getStats('testuser', 'anime', mockReq);

      expect(result).toEqual({
        count: 0,
        meanScore: 0,
        standardDeviation: 0,
        scoreDistribution: {},
        formatDistribution: {},
        statusDistribution: {},
        countryDistribution: {},
      });
    });
  });
});
