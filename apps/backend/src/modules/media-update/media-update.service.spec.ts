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

  const mockPrisma = {
    aquilaAnimeV2: { findMany: jest.fn() },
    aquilaMangaV2: { findMany: jest.fn() },
    aquilaBookV2: { findMany: jest.fn() },
    aquilaGameV2: { findMany: jest.fn() },
    aquilaMovieV2: { findMany: jest.fn() },
    aquilaTvV2: { findMany: jest.fn() },
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
  });

  it('should filter V2 media released in the past 3 months and refresh them', async () => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    mockPrisma.aquilaAnimeV2.findMany.mockResolvedValue([
      { id: 1, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
      { id: 2, startDateYear: sixMonthsAgo.getFullYear(), startDateMonth: sixMonthsAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaMangaV2.findMany.mockResolvedValue([
      { id: 3, startDateYear: oneMonthAgo.getFullYear(), startDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaBookV2.findMany.mockResolvedValue([
      { id: 4, releaseDateYear: oneMonthAgo.getFullYear(), releaseDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaGameV2.findMany.mockResolvedValue([
      { id: 5, releaseDateYear: oneMonthAgo.getFullYear(), releaseDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaMovieV2.findMany.mockResolvedValue([
      { id: 6, releaseDateYear: oneMonthAgo.getFullYear(), releaseDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    mockPrisma.aquilaTvV2.findMany.mockResolvedValue([
      { id: 7, releaseDateYear: oneMonthAgo.getFullYear(), releaseDateMonth: oneMonthAgo.getMonth() + 1 },
    ]);

    await service.updateRecentMedia();

    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(1);
    expect(mockAnimeService.refreshAnime).not.toHaveBeenCalledWith(2);

    expect(mockMangaService.refreshManga).toHaveBeenCalledWith(3);
    expect(mockBookService.refreshBook).toHaveBeenCalledWith(4);
    expect(mockGameService.refreshGame).toHaveBeenCalledWith(5);
    expect(mockMovieService.refreshMovie).toHaveBeenCalledWith(6);
    expect(mockTvService.refreshTv).toHaveBeenCalledWith(7);
  });

  it('should continue refreshing other media when one refresh fails', async () => {
    mockPrisma.aquilaAnimeV2.findMany.mockResolvedValue([
      { id: 10, startDateYear: new Date().getFullYear(), startDateMonth: new Date().getMonth() + 1 },
      { id: 20, startDateYear: new Date().getFullYear(), startDateMonth: new Date().getMonth() + 1 },
    ]);
    mockPrisma.aquilaMangaV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaBookV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaGameV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaMovieV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaTvV2.findMany.mockResolvedValue([]);

    mockAnimeService.refreshAnime
      .mockRejectedValueOnce(new Error('API Rate Limit'))
      .mockResolvedValueOnce({});

    await service.updateRecentMedia();

    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(10);
    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(20);
  });

  it('should refresh active media every week in updateActiveMediaWeekly', async () => {
    mockPrisma.aquilaAnimeV2.findMany.mockResolvedValue([
      { id: 101, status: 'RELEASING' },
      { id: 102, status: 'HIATUS' },
      { id: 103, status: 'UNKNOWN' },
    ]);
    mockPrisma.aquilaMangaV2.findMany.mockResolvedValue([
      { id: 201, status: 'RELEASING' },
    ]);
    mockPrisma.aquilaBookV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaGameV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaMovieV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaTvV2.findMany.mockResolvedValue([]);

    await service.updateActiveMediaWeekly();

    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(101);
    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(102);
    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(103);
    expect(mockMangaService.refreshManga).toHaveBeenCalledWith(201);
  });

  it('should refresh completed media with a 5% random daily selection in updateCompletedMediaDaily', async () => {
    mockPrisma.aquilaAnimeV2.findMany.mockResolvedValue([
      { id: 301, status: 'FINISHED' },
    ]);
    mockPrisma.aquilaMangaV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaBookV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaGameV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaMovieV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaTvV2.findMany.mockResolvedValue([]);

    jest.spyOn(Math, 'random').mockReturnValue(0.02); // 2% < 5% -> selected

    await service.updateCompletedMediaDaily();

    expect(mockAnimeService.refreshAnime).toHaveBeenCalledWith(301);
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('should skip media updated within the last 7 days in cron jobs', async () => {
    const recentUnixSeconds = Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000); // 2 days ago
    mockPrisma.aquilaAnimeV2.findMany.mockResolvedValue([
      { id: 401, status: 'RELEASING', alUpdatedAt: recentUnixSeconds },
    ]);
    mockPrisma.aquilaMangaV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaBookV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaGameV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaMovieV2.findMany.mockResolvedValue([]);
    mockPrisma.aquilaTvV2.findMany.mockResolvedValue([]);

    await service.updateActiveMediaWeekly();

    expect(mockAnimeService.refreshAnime).not.toHaveBeenCalledWith(401);
  });
});
