import { Test, TestingModule } from '@nestjs/testing';
import { MangaQueueService } from './manga-queue.service';
import { MangaExternal } from './manga.external';
import { MangaRepository } from './manga.repository';

describe('MangaQueueService', () => {
  let service: MangaQueueService;
  let mangaExternal: MangaExternal;
  let mangaRepository: MangaRepository;

  const mockMangaExternal = {
    fetchFullV2Record: jest.fn(),
  };

  const mockMangaRepository = {
    findByAnilistId: jest.fn(),
    upsertV2Record: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaQueueService,
        { provide: MangaExternal, useValue: mockMangaExternal },
        { provide: MangaRepository, useValue: mockMangaRepository },
      ],
    }).compile();

    service = module.get<MangaQueueService>(MangaQueueService);
    mangaExternal = module.get<MangaExternal>(MangaExternal);
    mangaRepository = module.get<MangaRepository>(MangaRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addUpsertJob', () => {
    it('should process upsert job when manga is not fully fetched', async () => {
      mockMangaRepository.findByAnilistId.mockResolvedValue(null);
      mockMangaExternal.fetchFullV2Record.mockResolvedValue({
        anilistId: 100,
        titlePrimary: 'Sample Manga',
      });
      mockMangaRepository.upsertV2Record.mockResolvedValue({ id: 1 });

      service.onModuleInit();
      await service.addUpsertJob(100);

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
      expect(mockMangaRepository.upsertV2Record).toHaveBeenCalled();
    });

    it('should skip job if manga already has alUpdatedAt', async () => {
      mockMangaRepository.findByAnilistId.mockResolvedValue({
        id: 1,
        anilistId: 100,
        alUpdatedAt: 1600000000,
      });

      service.onModuleInit();
      await service.addUpsertJob(100);

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockMangaExternal.fetchFullV2Record).not.toHaveBeenCalled();
    });
  });
});
