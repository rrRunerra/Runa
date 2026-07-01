import { Test, TestingModule } from '@nestjs/testing';
import { AnimeController } from './anime.controller';
import { AnimeService } from './anime.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { CacheService } from '../../providers/cache/cache.service';
import { Reflector } from '@nestjs/core';

describe('AnimeController', () => {
  let controller: AnimeController;
  let service: AnimeService;

  beforeEach(async () => {
    const mockAnimeService = {
      search: jest.fn(),
      getAnime: jest.fn(),
      refreshAnime: jest.fn(),
    };

    const mockAuthGuard = {
      canActivate: jest.fn().mockReturnValue(true),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnimeController],
      providers: [
        { provide: AnimeService, useValue: mockAnimeService },
        { provide: CacheService, useValue: mockCacheService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<AnimeController>(AnimeController);
    service = module.get<AnimeService>(AnimeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call animeService.search with the query name', async () => {
      const mockResult = [
        { id: '1', title: { romaji: 'Test Anime', english: '' } } as any,
      ];
      jest.spyOn(service, 'search').mockResolvedValue(mockResult);

      const result = await controller.search({ name: 'Test' });

      expect(service.search).toHaveBeenCalledWith('Test');
      expect(result).toBe(mockResult);
    });
  });

  describe('animeDetail', () => {
    it('should call animeService.getAnime with the parsed integer ID', async () => {
      const mockResult = { id: 123, title: { romaji: 'Sample' } } as any;
      jest.spyOn(service, 'getAnime').mockResolvedValue(mockResult);

      const result = await controller.animeDetail({ id: 123 });

      expect(service.getAnime).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });

  describe('refreshAnime', () => {
    it('should call animeService.refreshAnime with the parsed integer ID', async () => {
      const mockResult = { id: 123, title: { romaji: 'Refreshed' } } as any;
      jest.spyOn(service, 'refreshAnime').mockResolvedValue(mockResult);

      const result = await controller.refreshAnime({ id: 123 });

      expect(service.refreshAnime).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });
});
