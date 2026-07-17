import { Test, TestingModule } from '@nestjs/testing';
import { MediaUpdateService } from './media-update.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { BookService } from '../book/book.service';
import { GameService } from '../game/game.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';

describe('MediaUpdateService', () => {
  let service: MediaUpdateService;
  let prisma: PrismaService;
  let animeService: AnimeService;
  let mangaService: MangaService;
  let bookService: BookService;
  let gameService: GameService;
  let movieService: MovieService;
  let tvService: TvService;

  const mockPrisma = {
    aquilaAnime: { findMany: jest.fn() },
    aquilaManga: { findMany: jest.fn() },
    aquilaBook: { findMany: jest.fn() },
    aquilaGame: { findMany: jest.fn() },
    aquilaMovie: { findMany: jest.fn() },
    aquilaTv: { findMany: jest.fn() },
  };

  const mockAnimeService = { refreshAnime: jest.fn() };
  const mockMangaService = { refreshManga: jest.fn() };
  const mockBookService = { refreshBook: jest.fn() };
  const mockGameService = { refreshGame: jest.fn() };
  const mockMovieService = { refreshMovie: jest.fn() };
  const mockTvService = { refreshTv: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaUpdateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnimeService, useValue: mockAnimeService },
        { provide: MangaService, useValue: mockMangaService },
        { provide: BookService, useValue: mockBookService },
        { provide: GameService, useValue: mockGameService },
        { provide: MovieService, useValue: mockMovieService },
        { provide: TvService, useValue: mockTvService },
      ],
    }).compile();

    service = module.get<MediaUpdateService>(MediaUpdateService);
    prisma = module.get<PrismaService>(PrismaService);
    animeService = module.get<AnimeService>(AnimeService);
    mangaService = module.get<MangaService>(MangaService);
    bookService = module.get<BookService>(BookService);
    gameService = module.get<GameService>(GameService);
    movieService = module.get<MovieService>(MovieService);
    tvService = module.get<TvService>(TvService);
  });

  it('should filter media released in the past 3 months and refresh them', async () => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // Setup mocks returning one matching and one non-matching item for each type
    mockPrisma.aquilaAnime.findMany.mockResolvedValue([
      { id: 1, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
      { id: 2, startDateYear: sixMonthsAgo.getFullYear(), startDateMonth: sixMonthsAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaManga.findMany.mockResolvedValue([
      { id: 3, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaBook.findMany.mockResolvedValue([
      { id: 4, publishedYear: oneMonthAgo.getFullYear(), publishedMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaGame.findMany.mockResolvedValue([
      { id: 5, releasedYear: oneMonthAgo.getFullYear(), releasedMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaMovie.findMany.mockResolvedValue([
      { id: 6, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaTv.findMany.mockResolvedValue([
      { id: 7, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    await service.updateRecentMedia();

    // Verify only the correct IDs were refreshed
    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(1);
    expect(mockAnimeService.refreshAnime).not.toHaveBeenCalledWith(2);

    expect(mockMangaService.refreshManga).toHaveBeenCalledWith(3);
    expect(mockBookService.refreshBook).toHaveBeenCalledWith(4);
    expect(mockGameService.refreshGame).toHaveBeenCalledWith(5);
    expect(mockMovieService.refreshMovie).toHaveBeenCalledWith(6);
    expect(mockTvService.refreshTv).toHaveBeenCalledWith(7);
  });

  it('should continue refreshing other media when one refresh fails', async () => {
    mockPrisma.aquilaAnime.findMany.mockResolvedValue([
      { id: 10, startDateYear: new Date().getFullYear(), startDateMonth: new Date().getMonth() + 1 },
      { id: 20, startDateYear: new Date().getFullYear(), startDateMonth: new Date().getMonth() + 1 },
    ]);
    mockPrisma.aquilaManga.findMany.mockResolvedValue([]);
    mockPrisma.aquilaBook.findMany.mockResolvedValue([]);
    mockPrisma.aquilaGame.findMany.mockResolvedValue([]);
    mockPrisma.aquilaMovie.mockImplementation; // No movies
    mockPrisma.aquilaMovie.findMany.mockResolvedValue([]);
    mockPrisma.aquilaTv.findMany.mockResolvedValue([]);

    // Make the first call fail, second succeed
    mockAnimeService.refreshAnime
      .mockRejectedValueOnce(new Error('API Rate Limit'))
      .mockResolvedValueOnce({});

    await service.updateRecentMedia();

    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(10);
    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(20);
  });
});
