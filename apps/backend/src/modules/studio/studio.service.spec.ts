import { Test, TestingModule } from '@nestjs/testing';
import { StudioService } from './studio.service';
import { StudioRepository } from './studio.repository';
import { CacheService } from '../../providers/cache/cache.service';
import { rrNotFoundException } from 'src/providers/error';
import { StudioDetailEntity, StudioSearchEntity } from './studio.entities';

describe('StudioService', () => {
  let service: StudioService;
  let repository: jest.Mocked<Partial<StudioRepository>>;
  let cacheService: jest.Mocked<Partial<CacheService>>;

  const mockStudioDetail: StudioDetailEntity = {
    id: 1,
    anilistId: 10,
    malId: 20,
    aniDBId: null,
    tvDBId: null,
    bangumiId: null,
    name: 'Kyoto Animation',
    isAnimationStudio: true,
    siteUrl: 'http://www.kyotoanimation.co.jp/',
    favorites: 500,
    alFavorites: 1000,
    releases: [
      {
        id: 101,
        mediaType: 'ANIME',
        titlePrimary: 'Violet Evergarden',
        titleSecondary: 'ヴァイオレット・エヴァーガーデン',
        coverImage: 'https://image.example.com/cover.jpg',
        format: 'TV',
        status: 'FINISHED',
        year: 2018,
        month: 1,
        day: 11,
        isMain: true,
        averageScore: 86,
      },
    ],
  };

  const mockStudioSearch: StudioSearchEntity[] = [
    {
      id: 1,
      anilistId: 10,
      malId: 20,
      title: 'Kyoto Animation',
      secondaryTitle: null,
      coverImage: null,
      isAnimationStudio: true,
    },
  ];

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      search: jest.fn(),
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudioService,
        { provide: StudioRepository, useValue: repository },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<StudioService>(StudioService);
  });

  describe('getStudio', () => {
    it('should return cached studio data when cache hit occurs', async () => {
      // Arrange
      (cacheService.get as jest.Mock).mockResolvedValue(mockStudioDetail);

      // Act
      const result = await service.getStudio(1);

      // Assert
      expect(result).toEqual(mockStudioDetail);
      expect(repository.find).not.toHaveBeenCalled();
    });

    it('should query repository and cache result when cache miss occurs', async () => {
      // Arrange
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (repository.find as jest.Mock).mockResolvedValue(mockStudioDetail);

      // Act
      const result = await service.getStudio(1);

      // Assert
      expect(result).toEqual(mockStudioDetail);
      expect(repository.find).toHaveBeenCalledWith(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        mockStudioDetail,
        300,
      );
    });

    it('should throw rrNotFoundException when studio does not exist', async () => {
      // Arrange
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (repository.find as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getStudio(999)).rejects.toThrow(rrNotFoundException);
    });
  });

  describe('search', () => {
    it('should return cached search results when available', async () => {
      // Arrange
      (cacheService.get as jest.Mock).mockResolvedValue(mockStudioSearch);

      // Act
      const result = await service.search('Kyoto');

      // Assert
      expect(result).toEqual(mockStudioSearch);
      expect(repository.search).not.toHaveBeenCalled();
    });

    it('should query repository and cache results on cache miss', async () => {
      // Arrange
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (repository.search as jest.Mock).mockResolvedValue(mockStudioSearch);

      // Act
      const result = await service.search('Kyoto');

      // Assert
      expect(result).toEqual(mockStudioSearch);
      expect(repository.search).toHaveBeenCalledWith('Kyoto');
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        mockStudioSearch,
        60,
      );
    });

    it('should return empty array for empty query', async () => {
      // Act
      const result = await service.search('   ');

      // Assert
      expect(result).toEqual([]);
      expect(repository.search).not.toHaveBeenCalled();
    });
  });
});
