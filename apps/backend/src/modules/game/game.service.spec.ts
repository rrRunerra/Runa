import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { GameRepository } from './game.repository';
import { GameQueueService } from './game-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { GameExternal } from './game.external';

describe('GameService', () => {
  let service: GameService;

  const mockPrisma = {};

  const mockGameRepository = {
    search: jest.fn(),
    find: jest.fn(),
    findByIgdbId: jest.fn(),
    findByRawgId: jest.fn(),
    findSimilar: jest.fn(),
  };

  const mockGameQueueService = {
    addUpsertJob: jest.fn(),
    addSearchUpserts: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockGameExternal = {
    search: jest.fn(),
    fetchAndUpsertGame: jest.fn(),
    resolveAndUpsertGame: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.IGDB_CLIENT_ID = 'mock-client-id';
    process.env.IGDB_CLIENT_SECRET = 'mock-client-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GameRepository, useValue: mockGameRepository },
        { provide: GameQueueService, useValue: mockGameQueueService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: GameExternal, useValue: mockGameExternal },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('search', () => {
    it('should query IGDB if local DB returns no results', async () => {
      mockGameRepository.search.mockResolvedValue([]);
      mockGameExternal.search.mockResolvedValue([
        { id: 10, igdbId: 456, title: 'Mock IGDB Game', coverImage: 'cover.jpg' },
      ]);

      const result = await service.search('Mock');

      expect(mockGameRepository.search).toHaveBeenCalledWith('Mock');
      expect(mockGameExternal.search).toHaveBeenCalledWith('Mock');
      expect(mockGameQueueService.addSearchUpserts).toHaveBeenCalledWith([456]);
      expect(result).toEqual([
        { id: 10, igdbId: 456, title: 'Mock IGDB Game', coverImage: 'cover.jpg' },
      ]);
    });

    it('should queue background updates for local search results as well', async () => {
      mockGameRepository.search.mockResolvedValue([
        { id: 1, igdbId: 789, title: 'Local Game', coverImage: 'cover.jpg' },
      ]);

      const result = await service.search('Local');

      expect(mockGameRepository.search).toHaveBeenCalledWith('Local');
      expect(mockGameExternal.search).not.toHaveBeenCalled();
      expect(mockGameQueueService.addSearchUpserts).toHaveBeenCalledWith([789]);
      expect(result.length).toBe(1);
    });
  });

  describe('getGame', () => {
    it('should throw error if ID is NaN', async () => {
      await expect(service.getGame(NaN)).rejects.toThrow();
    });

    it('should return game by internal ID', async () => {
      const mockGame = { id: 10, igdbId: 456, titlePrimary: 'Internal Game' };
      mockGameRepository.find.mockResolvedValue(mockGame);

      const result = await service.getGame(10);

      expect(mockGameRepository.find).toHaveBeenCalledWith(10);
      expect(result).toBe(mockGame);
    });
  });
});
