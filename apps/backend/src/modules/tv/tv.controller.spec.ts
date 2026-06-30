import { Test, TestingModule } from '@nestjs/testing';
import { TvController } from './tv.controller';
import { TvService } from './tv.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('TvController', () => {
  let controller: TvController;
  let service: TvService;
  let reflector: Reflector;

  const mockTvService = {
    search: jest.fn(),
    getTv: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TvController],
      providers: [{ provide: TvService, useValue: mockTvService }, Reflector],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<TvController>(TvController);
    service = module.get<TvService>(TvService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('decorators', () => {
    it('search should have @Public() decorator', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.search);
      expect(isPublic).toBe(true);
    });

    it('getTv should have @Public() decorator', () => {
      const isPublic = reflector.get<boolean>('isPublic', controller.getTv);
      expect(isPublic).toBe(true);
    });
  });

  describe('search', () => {
    const mockResult = [
      { id: '123', title: { romaji: 'TV Show', english: 'TV Show' } } as any,
    ];

    it('should search series under session authenticated context', async () => {
      mockTvService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Show' });
      expect(service.search).toHaveBeenCalledWith('Show');
      expect(result).toBe(mockResult);
    });

    it('should search series under API key authenticated context', async () => {
      mockTvService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Show' });
      expect(service.search).toHaveBeenCalledWith('Show');
      expect(result).toBe(mockResult);
    });

    it('should search series under unauthenticated context', async () => {
      mockTvService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Show' });
      expect(service.search).toHaveBeenCalledWith('Show');
      expect(result).toBe(mockResult);
    });
  });

  describe('getTv', () => {
    const mockResult = { id: '99', title: { romaji: 'Sample TV Show' } } as any;

    it('should get series details under session authenticated context', async () => {
      mockTvService.getTv.mockResolvedValue(mockResult);
      const result = await controller.getTv('99');
      expect(service.getTv).toHaveBeenCalledWith('99');
      expect(result).toBe(mockResult);
    });

    it('should get series details under API key authenticated context', async () => {
      mockTvService.getTv.mockResolvedValue(mockResult);
      const result = await controller.getTv('99');
      expect(service.getTv).toHaveBeenCalledWith('99');
      expect(result).toBe(mockResult);
    });

    it('should get series details under unauthenticated context', async () => {
      mockTvService.getTv.mockResolvedValue(mockResult);
      const result = await controller.getTv('99');
      expect(service.getTv).toHaveBeenCalledWith('99');
      expect(result).toBe(mockResult);
    });
  });
});
