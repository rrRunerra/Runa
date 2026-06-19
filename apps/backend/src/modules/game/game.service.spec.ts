import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GameService } from './game.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { GameRepository } from './repositories/game.repository';
import { GameQueueService } from './services/game-queue.service';

describe('GameService', () => {
  let service: GameService;
  let repository: GameRepository;
  let queueService: GameQueueService;

  const mockPrisma = {};

  const mockGameRepository = {
    findByRawgId: jest.fn(),
    toMedia: jest.fn(),
  };

  const mockGameQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.RAWG_API_KEY = 'mock-rawg-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameRepository, useValue: mockGameRepository },
        { provide: GameQueueService, useValue: mockGameQueueService },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    repository = module.get<GameRepository>(GameRepository);
    queueService = module.get<GameQueueService>(GameQueueService);
  });

  describe('search', () => {
    it('should query RAWG API and map search results correctly', async () => {
      const mockApiResponse = {
        results: [
          {
            id: 456,
            name: 'Mock Game',
            background_image: 'bg-image',
            released: '2026-06-19',
            esrb_rating: { slug: 'mature' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.search('Mock');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.rawg.io/api/games?key=mock-rawg-key&search=Mock&page_size=20',
      );
      expect(result).toEqual([
        {
          id: '456',
          title: { romaji: 'Mock Game', english: 'Mock Game' },
          coverImage: { large: 'bg-image' },
          format: 'Game',
          status: 'Released',
          isAdult: true,
        },
      ]);
    });

    it('should return empty list if RAWG_API_KEY is not defined', async () => {
      delete process.env.RAWG_API_KEY;

      const result = await service.search('Mock');

      expect(result).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('getGame', () => {
    it('should throw error if ID is NaN', async () => {
      await expect(service.getGame(NaN)).rejects.toThrow('Invalid game ID: NaN');
    });

    it('should return cached game if within CACHE_DURATION_MS without calling fetch', async () => {
      const dbGame = { rawgId: 456, updatedAt: new Date() };
      mockGameRepository.findByRawgId.mockResolvedValue(dbGame);
      const mappedMedia = { id: '456', title: { romaji: 'Cached Game' } };
      mockGameRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getGame(456);

      expect(repository.findByRawgId).toHaveBeenCalledWith(456);
      expect(repository.toMedia).toHaveBeenCalledWith(dbGame);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch from RAWG and queue sync job on cache miss', async () => {
      mockGameRepository.findByRawgId.mockResolvedValue(null);

      const mockGameDetail = {
        id: 456,
        name: 'New RAWG Game',
        background_image: 'large-bg',
        released: '2026-06-19',
        developers: [{ name: 'Dev Studio' }],
        genres: [{ name: 'RPG' }],
        platforms: [{ platform: { name: 'PC' } }],
        metacritic: 90,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGameDetail),
      });

      const result = await service.getGame(456);

      expect(global.fetch).toHaveBeenCalled();
      expect(queueService.addJob).toHaveBeenCalledWith(456);
      expect(result.id).toBe('456');
      expect(result.title.romaji).toBe('New RAWG Game');
      expect(result.genres).toEqual(['Platform: PC', 'RPG']);
      expect(result.averageScore).toBe(90);
    });

    it('should fall back to stale database record if fetch fails', async () => {
      const staleGame = { rawgId: 456, updatedAt: new Date(0) }; // 1970
      mockGameRepository.findByRawgId.mockResolvedValue(staleGame);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
      const mappedMedia = { id: '456', title: { romaji: 'Stale Game' } };
      mockGameRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getGame(456);

      expect(result).toBe(mappedMedia);
    });

    it('should throw NotFoundException if fetch fails and no DB record exists', async () => {
      mockGameRepository.findByRawgId.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      await expect(service.getGame(456)).rejects.toThrow(NotFoundException);
    });
  });
});
