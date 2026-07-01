import { Test, TestingModule } from '@nestjs/testing';
import { MangaQueueService } from './manga-queue.service';
import { MangaExternal } from './manga.external';
import { CacheService } from '../../providers/cache/cache.service';
import type { MangaSearchEntity } from './manga.entities';

describe('MangaQueueService', () => {
  let service: MangaQueueService;
  let mangaExternal: MangaExternal;
  let cacheService: CacheService;

  const mockMangaExternal = {
    search: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Fast-forward setTimeout so tests don't actually wait
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaQueueService,
        { provide: MangaExternal, useValue: mockMangaExternal },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<MangaQueueService>(MangaQueueService);
    mangaExternal = module.get<MangaExternal>(MangaExternal);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addSearchRefresh and search queue processing', () => {
    const mockSearchResults: MangaSearchEntity[] = [
      {
        id: 1,
        title: 'Naruto',
        secondaryTitle: null,
        coverImage: 'cover.jpg',
        format: 'MANGA',
        status: 'FINISHED',
        isAdult: false,
        averageScore: 80,
      },
    ];

    it('should fetch from MangaExternal and update cache on search refresh', async () => {
      mockMangaExternal.search.mockResolvedValue(mockSearchResults);

      // Initialize the queue listener
      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'manga-search:naruto');

      // Allow async pipeline to execute
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.search).toHaveBeenCalledWith('Naruto');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'manga-search:naruto',
        JSON.stringify(mockSearchResults),
        60 * 60,
      );
    });

    it('should not update cache if search returns empty results', async () => {
      mockMangaExternal.search.mockResolvedValue([]);

      service.onModuleInit();
      service.addSearchRefresh('Empty', 'manga-search:empty');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.search).toHaveBeenCalledWith('Empty');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should deduplicate identical pending searches', async () => {
      let resolveSearch!: (value: MangaSearchEntity[]) => void;
      mockMangaExternal.search.mockImplementation(() => {
        return new Promise<MangaSearchEntity[]>((resolve) => {
          resolveSearch = resolve;
        });
      });

      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'manga-search:naruto');
      service.addSearchRefresh('Naruto', 'manga-search:naruto');

      // Allow the observable pipe to start processing the first job
      await new Promise((resolve) => process.nextTick(resolve));

      // Resolve the first search
      resolveSearch!(mockSearchResults);
      await new Promise((resolve) => process.nextTick(resolve));

      // External should only be called once despite adding the same search twice
      expect(mockMangaExternal.search).toHaveBeenCalledTimes(1);
    });

    it('should allow a different search after a pending one completes', async () => {
      mockMangaExternal.search
        .mockResolvedValueOnce(mockSearchResults)
        .mockResolvedValueOnce([
          {
            id: 2,
            title: 'One Piece',
            secondaryTitle: null,
            coverImage: null,
            format: 'MANGA',
            status: 'RELEASING',
            isAdult: false,
            averageScore: 90,
          },
        ]);

      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'manga-search:naruto');

      await new Promise((resolve) => process.nextTick(resolve));

      // After Naruto completes, add a different search
      service.addSearchRefresh('One Piece', 'manga-search:onepiece');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.search).toHaveBeenCalledTimes(2);
      expect(mockMangaExternal.search).toHaveBeenNthCalledWith(1, 'Naruto');
      expect(mockMangaExternal.search).toHaveBeenNthCalledWith(2, 'One Piece');
    });

    it('should handle search errors gracefully and not crash the queue', async () => {
      mockMangaExternal.search.mockRejectedValue(new Error('API error'));

      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'manga-search:naruto');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.search).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();

      // Queue should still work after error - add another search
      mockMangaExternal.search.mockResolvedValue(mockSearchResults);
      service.addSearchRefresh('OnePiece', 'manga-search:onepiece');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.search).toHaveBeenCalledWith('OnePiece');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'manga-search:onepiece',
        JSON.stringify(mockSearchResults),
        60 * 60,
      );
    });

    it('should process searches sequentially (concurrency 1)', async () => {
      const callOrder: number[] = [];
      mockMangaExternal.search.mockImplementation(
        (query: string) =>
          new Promise<MangaSearchEntity[]>((resolve) => {
            callOrder.push(Number(query));
            const results: MangaSearchEntity[] = [
              {
                id: Number(query),
                title: query,
                secondaryTitle: null,
                coverImage: null,
                format: 'MANGA',
                status: 'FINISHED',
                isAdult: false,
                averageScore: null,
              },
            ];
            resolve(results);
          }),
      );

      service.onModuleInit();
      service.addSearchRefresh('1', 'cache:1');
      service.addSearchRefresh('2', 'cache:2');

      await new Promise((resolve) => process.nextTick(resolve));
      await new Promise((resolve) => process.nextTick(resolve));

      expect(callOrder).toEqual([1, 2]);
      expect(mockMangaExternal.search).toHaveBeenCalledTimes(2);
    });
  });
});
