import { Test, TestingModule } from '@nestjs/testing';
import { MangaController } from './manga.controller';
import { MangaService } from './manga.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('MangaController', () => {
  let controller: MangaController;
  let service: MangaService;
  let reflector: Reflector;

  const mockMangaService = {
    search: jest.fn(),
    getManga: jest.fn(),
    refreshManga: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MangaController],
      providers: [
        { provide: MangaService, useValue: mockMangaService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<MangaController>(MangaController);
    service = module.get<MangaService>(MangaService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('decorators', () => {
    it('search should have @Public() decorator (accessible without authentication)', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.search);
      expect(isPublic).toBe(true);
    });

    it('mangaDetail should have @Public() decorator (accessible without authentication)', () => {
      const isPublic = reflector.get<boolean>(
        'isPublic',
        controller.mangaDetail,
      );
      expect(isPublic).toBe(true);
    });
  });

  describe('search', () => {
    const mockResult = [
      {
        id: 1,
        title: { romaji: 'Test Manga', english: 'Test Manga' },
      } as any,
    ];

    it('should call mangaService.search with the query name', async () => {
      mockMangaService.search.mockResolvedValue(mockResult);

      const result = await controller.search({ name: 'Test' });

      expect(service.search).toHaveBeenCalledWith('Test');
      expect(result).toBe(mockResult);
    });
  });

  describe('mangaDetail', () => {
    const mockResult = {
      id: 123,
      title: { romaji: 'Test Manga Detail' },
    } as any;

    it('should call mangaService.getManga with the parsed integer ID', async () => {
      mockMangaService.getManga.mockResolvedValue(mockResult);

      const result = await controller.mangaDetail({ id: 123 });

      expect(service.getManga).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });

  describe('refreshAnime', () => {
    const mockResult = {
      id: 123,
      title: { romaji: 'Refreshed Manga' },
    } as any;

    it('should call mangaService.refreshManga with the parsed integer ID', async () => {
      mockMangaService.refreshManga.mockResolvedValue(mockResult);

      const result = await controller.refreshAnime({ id: 123 });

      expect(service.refreshManga).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });
});
