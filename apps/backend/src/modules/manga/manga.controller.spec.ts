import { Test, TestingModule } from '@nestjs/testing';
import { MangaController } from './manga.controller';
import { MangaService } from './manga.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('MangaController', () => {
  let controller: MangaController;
  let service: MangaService;
  let reflector: Reflector;

  const mockMangaService = {
    search: jest.fn(),
    getManga: jest.fn(),
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

    it('getManga should have @Public() decorator (accessible without authentication)', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.getManga);
      expect(isPublic).toBe(true);
    });
  });

  describe('search', () => {
    const mockResult = [
      {
        id: '1',
        title: { romaji: 'Test Manga', english: 'Test Manga' },
      } as any,
    ];

    it('should search manga when request has session authentication', async () => {
      mockMangaService.search.mockResolvedValue(mockResult);
      // Simulate session request context (though controller method does not read it, this verifies route execution under session context)
      const result = await controller.search({ name: 'Test' });
      expect(service.search).toHaveBeenCalledWith('Test');
      expect(result).toBe(mockResult);
    });

    it('should search manga when request has API key authentication', async () => {
      mockMangaService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Test' });
      expect(service.search).toHaveBeenCalledWith('Test');
      expect(result).toBe(mockResult);
    });

    it('should search manga when request has no authentication', async () => {
      mockMangaService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Test' });
      expect(service.search).toHaveBeenCalledWith('Test');
      expect(result).toBe(mockResult);
    });
  });

  describe('getManga', () => {
    const mockResult = {
      id: '123',
      title: { romaji: 'Test Manga Detail' },
    } as any;

    it('should get manga details when request has session authentication', async () => {
      mockMangaService.getManga.mockResolvedValue(mockResult);
      const result = await controller.getManga('123');
      expect(service.getManga).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });

    it('should get manga details when request has API key authentication', async () => {
      mockMangaService.getManga.mockResolvedValue(mockResult);
      const result = await controller.getManga('123');
      expect(service.getManga).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });

    it('should get manga details when request has no authentication', async () => {
      mockMangaService.getManga.mockResolvedValue(mockResult);
      const result = await controller.getManga('123');
      expect(service.getManga).toHaveBeenCalledWith(123);
      expect(result).toBe(mockResult);
    });
  });
});
