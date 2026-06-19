import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeRepository } from './repositories/anime.repository';
import { AnimeQueueService } from './services/anime-queue.service';

describe('AnimeService', () => {
  let service: AnimeService;
  let repository: AnimeRepository;
  let queueService: AnimeQueueService;

  const mockPrisma = {};

  const mockRepository = {
    findByAnilistId: jest.fn(),
    toMedia: jest.fn(),
    upsert: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnimeRepository, useValue: mockRepository },
        { provide: AnimeQueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<AnimeService>(AnimeService);
    repository = module.get<AnimeRepository>(AnimeRepository);
    queueService = module.get<AnimeQueueService>(AnimeQueueService);
  });

  describe('search', () => {
    it('should query AniList API and map results correctly', async () => {
      const mockAniListResponse = {
        data: {
          Page: {
            media: [
              {
                id: 1,
                title: { romaji: 'Romaji Title', english: 'English Title' },
                coverImage: { large: 'image-large' },
                format: 'TV',
                status: 'FINISHED',
                isAdult: false,
              },
            ],
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockAniListResponse),
      });

      const result = await service.search('Test Name');

      expect(global.fetch).toHaveBeenCalledWith('https://graphql.anilist.co', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test Name'),
      }));
      expect(result).toEqual([
        {
          id: '1',
          title: { romaji: 'Romaji Title', english: 'English Title' },
          coverImage: { large: 'image-large' },
          format: 'TV',
          status: 'FINISHED',
          isAdult: false,
        },
      ]);
    });
  });

  describe('getAnime', () => {
    it('should throw error for NaN id', async () => {
      await expect(service.getAnime(NaN)).rejects.toThrow('Invalid anime ID: NaN');
    });

    it('should return from database on a fresh cache hit without calling fetch', async () => {
      const dbAnime = { anilistId: 1, updatedAt: new Date() };
      mockRepository.findByAnilistId.mockResolvedValue(dbAnime);
      const mappedMedia = { id: '1', anilistId: 1, title: { romaji: 'Cached' } };
      mockRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getAnime(1);

      expect(repository.findByAnilistId).toHaveBeenCalledWith(1);
      expect(repository.toMedia).toHaveBeenCalledWith(dbAnime);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch from AniList, add job to queue, and return media on cache miss', async () => {
      mockRepository.findByAnilistId.mockResolvedValue(null);

      const mockAniListResponse = {
        data: {
          Media: {
            id: 1,
            idMal: 10,
            title: { romaji: 'New Romaji' },
            coverImage: { large: 'large-img' },
            format: 'MOVIE',
            status: 'FINISHED',
            trailer: { id: 'yt-id', site: 'youtube' },
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockAniListResponse),
      });

      const result = await service.getAnime(1);

      expect(global.fetch).toHaveBeenCalled();
      expect(queueService.addJob).toHaveBeenCalledWith(1);
      expect(result.id).toBe('1');
      expect(result.malId).toBe(10);
      expect(result.trailers).toEqual([
        {
          id: 'yt-id',
          name: 'Official Trailer',
          site: 'youtube',
          url: 'https://www.youtube.com/watch?v=yt-id',
        },
      ]);
    });

    it('should fall back to database if AniList fetch fails but stale db record exists', async () => {
      const staleAnime = { anilistId: 1, updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }; // 2 days old
      mockRepository.findByAnilistId.mockResolvedValue(staleAnime);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const mappedStaleMedia = { id: '1', title: { romaji: 'Stale' } };
      mockRepository.toMedia.mockReturnValue(mappedStaleMedia);

      const result = await service.getAnime(1);

      expect(global.fetch).toHaveBeenCalled();
      expect(result).toBe(mappedStaleMedia);
    });

    it('should throw NotFoundException if fetch fails and no db record exists', async () => {
      mockRepository.findByAnilistId.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.getAnime(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureAnime', () => {
    it('should create new record and add job if anime not in database', async () => {
      mockRepository.findByAnilistId.mockResolvedValue(null);
      const mockNewAnime = { anilistId: 1, malId: 10, titleRomaji: 'New' };
      mockRepository.upsert.mockResolvedValue(mockNewAnime);

      const result = await service.ensureAnime(1, 10, 'New', 'image-url');

      expect(repository.findByAnilistId).toHaveBeenCalledWith(1);
      expect(repository.upsert).toHaveBeenCalledWith(1, {
        anilistId: 1,
        malId: 10,
        titleRomaji: 'New',
        coverImageLarge: 'image-url',
      });
      expect(queueService.addJob).toHaveBeenCalledWith(1);
      expect(result).toBe(mockNewAnime);
    });

    it('should update malId if anime exists in db but lacks malId', async () => {
      const existingAnime = { anilistId: 1, malId: null };
      mockRepository.findByAnilistId.mockResolvedValue(existingAnime);
      const updatedAnime = { anilistId: 1, malId: 10 };
      mockRepository.upsert.mockResolvedValue(updatedAnime);

      const result = await service.ensureAnime(1, 10);

      expect(repository.upsert).toHaveBeenCalledWith(1, { malId: 10 });
      expect(queueService.addJob).not.toHaveBeenCalled();
      expect(result).toBe(updatedAnime);
    });
  });
});
