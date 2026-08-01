import { Test, TestingModule } from '@nestjs/testing';
import { AnimeQueueService } from './anime-queue.service';
import { AnimeExternal } from './anime.external';
import { AnimeRepository } from './anime.repository';
import { MangaQueueService } from '../manga/manga-queue.service';

describe('AnimeQueueService', () => {
  let service: AnimeQueueService;
  let animeExternal: AnimeExternal;
  let animeRepository: AnimeRepository;

  const mockAnimeExternal = {
    fetchFullV2Record: jest.fn(),
  };

  const mockAnimeRepository = {
    findByAnilistId: jest.fn(),
    upsertV2Record: jest.fn(),
  };

  const mockMangaQueueService = {
    addUpsertJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeQueueService,
        { provide: AnimeExternal, useValue: mockAnimeExternal },
        { provide: AnimeRepository, useValue: mockAnimeRepository },
        { provide: MangaQueueService, useValue: mockMangaQueueService },
      ],
    }).compile();

    service = module.get<AnimeQueueService>(AnimeQueueService);
    animeExternal = module.get<AnimeExternal>(AnimeExternal);
    animeRepository = module.get<AnimeRepository>(AnimeRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addUpsertJob', () => {
    it('should process upsert job when anime is not fully fetched', async () => {
      mockAnimeRepository.findByAnilistId.mockResolvedValue(null);
      mockAnimeExternal.fetchFullV2Record.mockResolvedValue({
        anilistId: 100,
        titlePrimary: 'Sample Anime',
      });
      mockAnimeRepository.upsertV2Record.mockResolvedValue({ id: 1 });

      service.onModuleInit();
      await service.addUpsertJob(100);

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
      expect(mockAnimeRepository.upsertV2Record).toHaveBeenCalled();
    });

    it('should skip job if anime already has alUpdatedAt unless force option is set', async () => {
      mockAnimeRepository.findByAnilistId.mockResolvedValue({
        id: 1,
        anilistId: 100,
        alUpdatedAt: new Date().toISOString(),
      });

      service.onModuleInit();
      await service.addUpsertJob(100);

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.fetchFullV2Record).not.toHaveBeenCalled();
    });

    it('should process job even with fresh alUpdatedAt if force is true', async () => {
      mockAnimeRepository.findByAnilistId.mockResolvedValue({
        id: 1,
        anilistId: 100,
        alUpdatedAt: new Date().toISOString(),
      });
      mockAnimeExternal.fetchFullV2Record.mockResolvedValue({
        anilistId: 100,
        titlePrimary: 'Forced Anime',
      });
      mockAnimeRepository.upsertV2Record.mockResolvedValue({ id: 1 });

      service.onModuleInit();
      await service.addUpsertJob(100, { force: true });

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
    });

    it('should not queue child relations when skipRelations option is true', async () => {
      mockAnimeRepository.findByAnilistId.mockResolvedValue(null);
      mockAnimeExternal.fetchFullV2Record.mockResolvedValue({
        anilistId: 100,
        titlePrimary: 'Sample Anime',
        relations: [{ targetType: 'ANIME', targetAnilistId: 200 }],
      });
      mockAnimeRepository.upsertV2Record.mockResolvedValue({ id: 1 });

      service.onModuleInit();
      await service.addUpsertJob(100, { skipRelations: true });

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
      // Relations shouldn't be queued recursively
      expect(mockAnimeExternal.fetchFullV2Record).not.toHaveBeenCalledWith(200);
    });
  });
});
