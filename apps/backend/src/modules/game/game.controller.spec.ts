import { Test, TestingModule } from '@nestjs/testing';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('GameController', () => {
  let controller: GameController;
  let service: GameService;

  const mockGameService = {
    search: jest.fn(),
    getGame: jest.fn(),
  };

  const mockDualAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        { provide: GameService, useValue: mockGameService },
        Reflector,
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useValue(mockDualAuthGuard)
      .compile();

    controller = module.get<GameController>(GameController);
    service = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call gameService.search with the query name', async () => {
      const mockResult = [{ id: '1', title: { romaji: 'Sample Game' } } as any];
      mockGameService.search.mockResolvedValue(mockResult);

      const result = await controller.search({ name: 'Sample' });

      expect(service.search).toHaveBeenCalledWith('Sample');
      expect(result).toBe(mockResult);
    });
  });

  describe('getGame', () => {
    it('should call gameService.getGame with the parsed integer ID', async () => {
      const mockResult = { id: '456', title: { romaji: 'Game Detail' } } as any;
      mockGameService.getGame.mockResolvedValue(mockResult);

      const result = await controller.getGame('456');

      expect(service.getGame).toHaveBeenCalledWith(456);
      expect(result).toBe(mockResult);
    });
  });
});
