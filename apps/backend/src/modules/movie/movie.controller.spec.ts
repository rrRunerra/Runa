import { Test, TestingModule } from '@nestjs/testing';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Reflector } from '@nestjs/core';

describe('MovieController', () => {
  let controller: MovieController;
  let service: MovieService;
  let reflector: Reflector;

  const mockMovieService = {
    search: jest.fn(),
    getMovie: jest.fn(),
    refreshMovie: jest.fn(),
    ensureMovie: jest.fn(),
    getSimilarMovies: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieController],
      providers: [
        { provide: MovieService, useValue: mockMovieService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<MovieController>(MovieController);
    service = module.get<MovieService>(MovieService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    const mockResult = [
      {
        id: 1,
        title: 'Movie Title',
      } as any,
    ];

    it('should search movies', async () => {
      mockMovieService.search.mockResolvedValue(mockResult);
      const result = await controller.search({ name: 'Movie' });
      expect(service.search).toHaveBeenCalledWith('Movie');
      expect(result).toBe(mockResult);
    });
  });

  describe('getMovie', () => {
    const mockResult = { id: 99, titlePrimary: 'Sample Movie' } as any;

    it('should get movie details', async () => {
      mockMovieService.getMovie.mockResolvedValue(mockResult);
      const result = await controller.getMovie('99');
      expect(service.getMovie).toHaveBeenCalledWith(99);
      expect(result).toBe(mockResult);
    });
  });
});
