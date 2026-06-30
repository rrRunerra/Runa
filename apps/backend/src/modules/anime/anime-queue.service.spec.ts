import { Test, TestingModule } from '@nestjs/testing';
import { AnimeQueueService } from './anime-queue.service';
import { AnimeRepository } from './repositories/anime.repository';

describe('AnimeQueueService', () => {
  let service: AnimeQueueService;
  let repository: AnimeRepository;

  const mockRepository = {
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // Fast-forward setTimeouts so tests don't actually wait
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeQueueService,
        { provide: AnimeRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AnimeQueueService>(AnimeQueueService);
    repository = module.get<AnimeRepository>(AnimeRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addJob and queue execution', () => {
    it('should fetch anime from AniList and upsert to repository', async () => {
      const mockAniListResponse = {
        data: {
          Media: {
            id: 1,
            idMal: 10,
            title: { romaji: 'Romaji' },
            coverImage: { large: 'large-img' },
            trailer: null,
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue(mockAniListResponse),
      });

      mockRepository.upsert.mockResolvedValue({});

      // Initialize the queue listener
      service.onModuleInit();

      service.addJob(1);

      // Allow async code inside mergeMap pipeline to run
      await new Promise((resolve) => process.nextTick(resolve));

      expect(global.fetch).toHaveBeenCalled();
      expect(repository.upsert).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          anilistId: 1,
          malId: 10,
        }),
      );
    });

    it('should retry on AniList rate limiting (429 status code)', async () => {
      const mockAniListResponse = {
        data: {
          Media: {
            id: 1,
            idMal: 10,
            title: { romaji: 'Romaji' },
            coverImage: { large: 'large-img' },
          },
        },
      };

      // Mock rate limits: first call returns 429, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          status: 429,
          ok: false,
          headers: { get: jest.fn().mockReturnValue('1') }, // Retry-After: 1
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: jest.fn().mockResolvedValue(mockAniListResponse),
        });

      service.onModuleInit();
      service.addJob(1);

      // Wait for execution ticks to process retry timer and resolution
      await new Promise((resolve) => process.nextTick(resolve));
      await new Promise((resolve) => process.nextTick(resolve));

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(repository.upsert).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ anilistId: 1 }),
      );
    });

    it('should ignore duplicate jobs if they are currently processing', async () => {
      (global.fetch as jest.Mock).mockImplementation(async () => {
        // Return a promise that doesn't resolve immediately
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          status: 200,
          ok: true,
          json: jest
            .fn()
            .mockResolvedValue({
              data: {
                Media: { id: 1, title: {}, coverImage: { large: 'large-img' } },
              },
            }),
        };
      });

      service.onModuleInit();
      // Add first job
      service.addJob(1);
      // Add duplicate job
      service.addJob(1);

      expect(service['processing'].has(1)).toBe(true);

      // Fast-forward Jest timers if necessary, though we mocked setTimeout above
      await new Promise((resolve) => process.nextTick(resolve));

      // Fetch should only be triggered once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
