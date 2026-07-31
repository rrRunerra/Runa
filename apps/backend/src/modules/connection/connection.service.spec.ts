import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { StatsService } from '../stats/stats.service';
import { NotificationService } from '../notification/notification.service';

const mockProviderInstance = {
  capabilities: ['IMPORT_LIST'],
  isEnabled: true,
  getAuthUrl: jest.fn().mockResolvedValue('https://auth.url'),
  handleCallback: jest.fn().mockResolvedValue({}),
  fetchUserList: jest.fn().mockResolvedValue([
    {
      mediaType: 'anime',
      anilistId: 1,
      malId: 10,
      title: 'Test Anime',
      status: 'WATCHING',
      progress: 5,
      coverImage: 'img',
    },
  ]),
};

jest.mock('@runa/connections', () => {
  return {
    ConnectionLoader: jest.fn().mockImplementation(() => ({
      loadConnections: jest.fn(),
      getConnection: jest.fn().mockReturnValue(mockProviderInstance),
    })),
    ConnectionCapability: {
      IMPORT_LIST: 'IMPORT_LIST',
      SYNC: 'SYNC',
    },
  };
});

describe('ConnectionService', () => {
  let service: ConnectionService;
  let prismaService: PrismaService;

  const mockPrismaClient = {
    connections: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    aquilaAnimeUserListV2: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aquilaMangaUserListV2: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aquilaTvUserListV2: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    aquilaTvWatchedEpisodeV2: {
      createMany: jest.fn(),
    },
    aquilaTvV2: {
      findUnique: jest.fn(),
    },
    aquilaMovieUserListV2: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };

  const mockPrisma = { client: mockPrismaClient };

  const mockAnimeService = { ensureAnime: jest.fn() };
  const mockMangaService = { ensureManga: jest.fn() };
  const mockMovieService = { ensureMovie: jest.fn() };
  const mockTvService = { ensureTv: jest.fn() };
  const mockStatsService = {
    recalculate: jest.fn().mockResolvedValue(undefined),
  };
  const mockNotificationService = {
    create: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockAnimeService.ensureAnime.mockResolvedValue({ id: 1 });
    mockMangaService.ensureManga.mockResolvedValue({ id: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnimeService, useValue: mockAnimeService },
        { provide: MangaService, useValue: mockMangaService },
        { provide: MovieService, useValue: mockMovieService },
        { provide: TvService, useValue: mockTvService },
        { provide: StatsService, useValue: mockStatsService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ConnectionService>(ConnectionService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Initialize loader
    await service.onModuleInit();
  });

  describe('getConnectionInstance', () => {
    it('should throw BadRequestException if provider is invalid', () => {
      expect(() => service.getConnectionInstance('INVALID')).toThrow(
        BadRequestException,
      );
    });

    it('should retrieve a valid and enabled provider', () => {
      const provider = service.getConnectionInstance('anilist');
      expect(provider).toBe(mockProviderInstance);
    });
  });

  describe('getAuthUrl', () => {
    it('should call getAuthUrl on the provider instance', async () => {
      const url = await service.getAuthUrl('anilist', 'token-123', '/redirect');
      expect(mockProviderInstance.getAuthUrl).toHaveBeenCalledWith(
        'token-123',
        '/redirect',
      );
      expect(url).toBe('https://auth.url');
    });
  });

  describe('handleCallback', () => {
    it('should call handleCallback on the provider instance', async () => {
      await service.handleCallback('anilist', 'code-123', 'testuser');
      expect(mockProviderInstance.handleCallback).toHaveBeenCalledWith(
        'code-123',
        'testuser',
      );
    });
  });

  describe('findAll', () => {
    it('should query connections from prisma', async () => {
      const mockResult = [
        { id: '1', provider: 'ANILIST', linkedUsername: 'linkuser' },
      ];
      mockPrismaClient.connections.findMany.mockResolvedValue(mockResult);

      const result = await service.findAll('testuser');

      expect(mockPrismaClient.connections.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser', linkedTo: undefined },
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
      expect(result).toBe(mockResult);
    });
  });

  describe('upsert', () => {
    it('should upsert connection details', async () => {
      const mockSaved = { id: '1', provider: 'ANILIST' };
      mockPrismaClient.connections.upsert.mockResolvedValue(mockSaved);

      const result = await service.upsert('testuser', {
        provider: 'anilist',
        linkedUsername: 'linkuser',
      });

      expect(mockPrismaClient.connections.upsert).toHaveBeenCalled();
      expect(result.id).toBe('1');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if connection to delete is missing', async () => {
      mockPrismaClient.connections.findUnique.mockResolvedValue(null);

      await expect(service.remove('testuser', 'anilist')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete from DB if connection exists', async () => {
      mockPrismaClient.connections.findUnique.mockResolvedValue({
        id: 'conn-1',
      });
      mockPrismaClient.connections.delete.mockResolvedValue({});

      const result = await service.remove('testuser', 'anilist');

      expect(mockPrismaClient.connections.delete).toHaveBeenCalledWith({
        where: { id: 'conn-1' },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('importList', () => {
    it('should throw BadRequestException if provider list import is not supported', async () => {
      const unsupportedProvider = { capabilities: [], isEnabled: true };
      service['loader'].getConnection = jest
        .fn()
        .mockReturnValue(unsupportedProvider);

      await expect(service.startImport('testuser', 'anilist')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should start list import and update activeImports status', async () => {
      service['loader'].getConnection = jest
        .fn()
        .mockReturnValue(mockProviderInstance);

      const result = await service.startImport('testuser', 'anilist');

      expect(result).toEqual({ status: 'processing' });
      expect(service.getImportStatus('testuser', 'anilist')).toEqual({
        total: 1,
        processed: 0,
        status: 'processing',
        failedItems: [],
      });
    });

    it('should run background import and save items to user list', async () => {
      service['loader'].getConnection = jest
        .fn()
        .mockReturnValue(mockProviderInstance);
      mockPrismaClient.aquilaAnimeUserListV2.findUnique.mockResolvedValue(null);
      mockPrismaClient.aquilaAnimeUserListV2.create.mockResolvedValue({});
      mockPrismaClient.user.findFirst.mockResolvedValue({ id: 'user-id-123' });

      await service['runImportInBackground']('testuser', 'anilist');

      expect(mockAnimeService.ensureAnime).toHaveBeenCalledWith(
        1,
        10,
        'Test Anime',
        'img',
      );
      expect(mockPrismaClient.aquilaAnimeUserListV2.create).toHaveBeenCalled();
      expect(service.getImportStatus('testuser', 'anilist').status).toBe(
        'completed',
      );
    });

    it('should run background import for manga and save items to aquilaMangaUserListV2 with chaptersProgress', async () => {
      const mangaProviderInstance = {
        ...mockProviderInstance,
        fetchUserList: jest.fn().mockResolvedValue([
          {
            mediaType: 'manga',
            anilistId: 64,
            malId: 100,
            title: 'Test Manga',
            status: 'READING',
            progress: 311,
            volumesProgress: 0,
            score: 10,
            coverImage: 'img',
          },
        ]),
      };
      service['loader'].getConnection = jest
        .fn()
        .mockReturnValue(mangaProviderInstance);
      mockPrismaClient.aquilaMangaUserListV2.findUnique.mockResolvedValue(null);
      mockPrismaClient.aquilaMangaUserListV2.create.mockResolvedValue({});
      mockPrismaClient.user.findFirst.mockResolvedValue({ id: 'user-id-123' });

      await service['runImportInBackground']('testuser', 'anilist');

      expect(mockMangaService.ensureManga).toHaveBeenCalledWith(
        64,
        100,
        'Test Manga',
        'img',
      );
      expect(mockPrismaClient.aquilaMangaUserListV2.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          mangaId: 1,
          status: 'READING',
          chaptersProgress: 311,
          volumesProgress: 0,
          score: 10,
        }),
      });
      expect(service.getImportStatus('testuser', 'anilist').status).toBe(
        'completed',
      );
    });

    it('should handle rate limiting (Too Many Requests) by notifying the user and failing gracefully/silently', async () => {
      const rateLimitError = new Error(
        'Failed to fetch AniList ANIME list: Too Many Requests',
      );
      const mockProviderWithRateLimit = {
        ...mockProviderInstance,
        fetchUserList: jest.fn().mockRejectedValue(rateLimitError),
      };
      service['loader'].getConnection = jest
        .fn()
        .mockReturnValue(mockProviderWithRateLimit);
      mockPrismaClient.user.findFirst.mockResolvedValue({ id: 'user-id-123' });

      await service['runImportInBackground']('testuser', 'anilist');

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        'user-id-123',
        expect.objectContaining({
          title: 'AniList Import Rate Limited',
          type: 'INFO',
        }),
      );
      expect(service.getImportStatus('testuser', 'anilist').status).toBe(
        'failed',
      );
    });
  });
});
