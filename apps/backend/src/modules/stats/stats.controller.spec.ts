import { Test, TestingModule } from '@nestjs/testing';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('StatsController', () => {
  let controller: StatsController;
  let service: StatsService;

  const mockStatsService = {
    getStats: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatsController],
      providers: [
        { provide: StatsService, useValue: mockStatsService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<StatsController>(StatsController);
    service = module.get<StatsService>(StatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should call statsService.getStats with lowercased params and return the result', async () => {
      const mockResult = { count: 10, meanScore: 8.5 };
      mockStatsService.getStats.mockResolvedValue(mockResult);

      const mockReq = {
        user: { id: 'user-1', username: 'testuser', permissions: [] },
      };

      const result = await controller.getStats(
        { username: 'TestUser', type: 'Anime' },
        mockReq as any,
      );

      expect(service.getStats).toHaveBeenCalledWith(
        'testuser',
        'anime',
        mockReq,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
