import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MangaService } from './manga.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { MangaRepository } from './repositories/manga.repository';
import { MangaQueueService } from './services/manga-queue.service';

describe('MangaService', () => {
  let service: MangaService;
  let repository: MangaRepository;
  let queueService: MangaQueueService;

  const mockPrisma = {};

  const mockMangaRepository = {
    findByAnilistId: jest.fn(),
    toMedia: jest.fn(),
    upsert: jest.fn(),
  };

  const mockMangaQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MangaRepository, useValue: mockMangaRepository },
        { provide: MangaQueueService, useValue: mockMangaQueueService },
      ],
    }).compile();

    service = module.get<MangaService>(MangaService);
    repository = module.get<MangaRepository>(MangaRepository);
    queueService = module.get<MangaQueueService>(MangaQueueService);
  });

  describe('search', () => {
    it('should query AniList GraphQL API and map search results correctly', async () => {
      const mockApiResponse = {
        data: {
          Page: {
            media: [
              {
                id: 1234,
                title: { romaji: 'Romaji Title', english: 'English Title' },
                coverImage: { large: 'cover-url' },
                format: 'MANGA',
                status: 'RELEASING',
                isAdult: false,
              },
            ],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.search('Test Manga');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://graphql.anilist.co',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test Manga'),
        }),
      );

      expect(result).toEqual([
        {
          id: '1234',
          title: { romaji: 'Romaji Title', english: 'English Title' },
          coverImage: { large: 'cover-url' },
          format: 'MANGA',
          status: 'RELEASING',
          isAdult: false,
        },
      ]);
    });
  });

  describe('getManga', () => {
    it('should throw error if ID is NaN', async () => {
      await expect(service.getManga(NaN)).rejects.toThrow('Invalid manga ID: NaN');
    });

    it('should return cached manga if within cache duration without calling fetch', async () => {
      const dbManga = { anilistId: 123, updatedAt: new Date() };
      mockMangaRepository.findByAnilistId.mockResolvedValue(dbManga);
      const mappedMedia = { id: '123', title: { romaji: 'Cached Manga' } };
      mockMangaRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getManga(123);

      expect(repository.findByAnilistId).toHaveBeenCalledWith(123);
      expect(repository.toMedia).toHaveBeenCalledWith(dbManga);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch from AniList and queue sync job on cache miss', async () => {
      mockMangaRepository.findByAnilistId.mockResolvedValue(null);

      const mockApiResponse = {
        data: {
          Media: {
            id: 123,
            idMal: 456,
            title: { romaji: 'Fresh Manga', english: 'Fresh English', native: 'Fresh Native' },
            coverImage: { extraLarge: 'xl', large: 'l', color: '#fff' },
            bannerImage: 'banner',
            format: 'MANGA',
            status: 'FINISHED',
            description: 'Desc',
            startDate: { year: 2020, month: 1, day: 1 },
            endDate: { year: 2021, month: 1, day: 1 },
            chapters: 100,
            volumes: 10,
            countryOfOrigin: 'JP',
            source: 'ORIGINAL',
            averageScore: 85,
            meanScore: 84,
            popularity: 1000,
            favourites: 50,
            trending: 5,
            genres: ['Action'],
            synonyms: [],
            hashtag: '#manga',
            tags: [{ name: 'Tag1', rank: 80, isMediaSpoiler: false }],
            staff: { edges: [{ role: 'Story & Art', node: { id: 1, name: { full: 'Author' } } }] },
            relations: { edges: [{ relationType: 'ADAPTATION', node: { id: 2, title: { romaji: 'Anime adaptation' }, type: 'ANIME', format: 'TV' } }] },
            externalLinks: [{ id: '1', url: 'site.com', site: 'Official' }],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.getManga(123);

      expect(global.fetch).toHaveBeenCalled();
      expect(queueService.addJob).toHaveBeenCalledWith(123);
      expect(result.id).toBe('123');
      expect(result.title.romaji).toBe('Fresh Manga');
      expect(result.chapters).toBe(100);
      expect(result.staff?.[0]?.name).toBe('Author');
      expect(result.relations?.[0]?.relationType).toBe('ADAPTATION');
    });

    it('should fetch from AniList and queue sync job on cache stale', async () => {
      const staleManga = { anilistId: 123, updatedAt: new Date(0) }; // Stale
      mockMangaRepository.findByAnilistId.mockResolvedValue(staleManga);

      const mockApiResponse = {
        data: {
          Media: {
            id: 123,
            title: { romaji: 'Fresh Romaji' },
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const result = await service.getManga(123);

      expect(global.fetch).toHaveBeenCalled();
      expect(queueService.addJob).toHaveBeenCalledWith(123);
      expect(result.id).toBe('123');
      expect(result.title.romaji).toBe('Fresh Romaji');
    });

    it('should fall back to stale database record if fetch fails', async () => {
      const staleManga = { anilistId: 123, updatedAt: new Date(0) };
      mockMangaRepository.findByAnilistId.mockResolvedValue(staleManga);
      const mappedMedia = { id: '123', title: { romaji: 'Stale Fallback' } };
      mockMangaRepository.toMedia.mockReturnValue(mappedMedia);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      const result = await service.getManga(123);

      expect(result).toBe(mappedMedia);
    });

    it('should throw NotFoundException if fetch fails and no DB record exists', async () => {
      mockMangaRepository.findByAnilistId.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(service.getManga(123)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureManga', () => {
    it('should return existing manga if it has malId', async () => {
      const existing = { anilistId: 123, malId: 456 };
      mockMangaRepository.findByAnilistId.mockResolvedValue(existing);

      const result = await service.ensureManga(123, 456);

      expect(result).toBe(existing);
      expect(mockMangaRepository.upsert).not.toHaveBeenCalled();
    });

    it('should update existing manga with malId if it was missing', async () => {
      const existing = { anilistId: 123, malId: null };
      const updated = { anilistId: 123, malId: 456 };
      mockMangaRepository.findByAnilistId.mockResolvedValue(existing);
      mockMangaRepository.upsert.mockResolvedValue(updated);

      const result = await service.ensureManga(123, 456);

      expect(result).toBe(updated);
      expect(mockMangaRepository.upsert).toHaveBeenCalledWith(123, { malId: 456 });
    });

    it('should upsert new manga and add queue job if it does not exist', async () => {
      mockMangaRepository.findByAnilistId.mockResolvedValue(null);
      const created = { anilistId: 123, malId: 456, titleRomaji: 'New Manga' };
      mockMangaRepository.upsert.mockResolvedValue(created);

      const result = await service.ensureManga(123, 456, 'New Manga', 'cover-image');

      expect(result).toBe(created);
      expect(mockMangaRepository.upsert).toHaveBeenCalledWith(123, {
        anilistId: 123,
        malId: 456,
        titleRomaji: 'New Manga',
        coverImageLarge: 'cover-image',
      });
      expect(queueService.addJob).toHaveBeenCalledWith(123);
    });
  });
});
