import { Injectable, Logger } from '@nestjs/common';
import {
  AnimeFormat,
  AnimeSeason,
  AnimeStatus,
  BookStatus,
  GameStatus,
  MangaFormat,
  MangaStatus,
  MovieStatus,
  Prisma,
  TvStatus,
} from '@runa/database';
import { rrError } from 'src/providers/error';
import { PrismaService } from '../../providers/database/prisma.service';
import { RankingsQueryDto } from './rankings.dto';
import {
  RankedMediaItemEntity,
  RankingsMetaResponse,
} from './rankings.entities';
import { RankingMediaType, RankingSourceOption } from './rankings.types';

@Injectable()
export class RankingsRepository {
  private readonly moduleCode = 'RaRpsty-';
  private readonly logger = new Logger(RankingsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async getRankings(
    type: RankingMediaType,
    query: RankingsQueryDto,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 100)));
    const skip = (page - 1) * limit;

    try {
      switch (type) {
        case 'anime':
          return this.getAnimeRankings(query, skip, limit);
        case 'manga':
          return this.getMangaRankings(query, skip, limit);
        case 'movie':
          return this.getMovieRankings(query, skip, limit);
        case 'tv':
          return this.getTvRankings(query, skip, limit);
        case 'game':
          return this.getGameRankings(query, skip, limit);
        case 'book':
          return this.getBookRankings(query, skip, limit);
        default:
          throw new rrError(`${this.moduleCode}IMT001`, {
            message: `Invalid media type for rankings: ${type}`,
          });
      }
    } catch (err: any) {
      this.logger.error(`Failed to fetch rankings for ${type}: ${err.message}`);
      if (err instanceof rrError) throw err;
      throw new rrError(`${this.moduleCode}FTFR001`, {
        message: `Failed to fetch rankings for ${type} from database`,
      });
    }
  }

  public async getMetadata(type: RankingMediaType): Promise<RankingsMetaResponse> {
    try {
      const sources = this.getSourcesForType(type);
      const [genres, years, statuses] = await Promise.all([
        this.getGenresForType(type),
        this.getYearsForType(type),
        this.getStatusesForType(type),
      ]);

      let formats: string[] = [];
      let seasons: string[] = [];

      if (type === 'anime') {
        formats = Object.values(AnimeFormat).filter((f) => f !== 'UNKNOWN');
        seasons = Object.values(AnimeSeason).filter((s) => s !== 'UNKNOWN');
      } else if (type === 'manga') {
        formats = Object.values(MangaFormat).filter((f) => f !== 'UNKNOWN');
      } else if (type === 'book') {
        formats = ['HARDCOVER', 'PAPERBACK', 'EBOOK', 'AUDIOBOOK'];
      }

      return {
        sources,
        genres,
        years,
        seasons,
        formats,
        statuses,
      };
    } catch (err: any) {
      this.logger.error(`Failed to get metadata for ${type}: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTGM001`, {
        message: `Failed to fetch rankings metadata for ${type}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Media Type Queries
  // ---------------------------------------------------------------------------

  private async getAnimeRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, season, format, status } = query;
    const where: Prisma.AquilaAnimeV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) {
      const yearNum = Number(year);
      where.OR = [{ startDateYear: yearNum }, { seasonYear: yearNum }];
    }
    if (season && season !== 'all') {
      where.seasonSeason = season.toUpperCase() as AnimeSeason;
    }
    if (format && format !== 'all') {
      where.format = format.toUpperCase() as AnimeFormat;
    }
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as AnimeStatus;
    }

    let orderBy: Prisma.AquilaAnimeV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    let externalScoreMax = 100;

    if (source === 'anilist') {
      where.alAverageScore = { not: null, gt: 0 };
      orderBy = [
        { alAverageScore: 'desc' },
        { alPopularity: 'desc' },
        { alFavorites: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'AniList';
    } else if (source === 'mal') {
      where.malAverageScore = { not: null, gt: 0 };
      orderBy = [
        { malAverageScore: 'desc' },
        { malPopularity: 'desc' },
        { malFavorites: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'MyAnimeList';
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { scoredCount: 'desc' },
        { popularity: 'desc' },
        { favorites: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaAnimeV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaAnimeV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'anilist') extScore = item.alAverageScore;
      else if (source === 'mal') extScore = item.malAverageScore;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: item.format,
        status: item.status,
        year: item.startDateYear || item.seasonYear || null,
        season: item.seasonSeason && item.seasonSeason !== 'UNKNOWN' ? item.seasonSeason : null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: item.popularity || item.alPopularity || item.malPopularity || 0,
        favorites: item.favorites || item.alFavorites || item.malFavorites || 0,
        scoredCount: item.scoredCount || 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  private async getMangaRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, format, status } = query;
    const where: Prisma.AquilaMangaV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) {
      where.startDateYear = Number(year);
    }
    if (format && format !== 'all') {
      where.format = format.toUpperCase() as MangaFormat;
    }
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as MangaStatus;
    }

    let orderBy: Prisma.AquilaMangaV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    const externalScoreMax = 100;

    if (source === 'anilist') {
      where.alAverageScore = { not: null, gt: 0 };
      orderBy = [
        { alAverageScore: 'desc' },
        { alPopularity: 'desc' },
        { alFavorites: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'AniList';
    } else if (source === 'mal') {
      where.malAverageScore = { not: null, gt: 0 };
      orderBy = [
        { malAverageScore: 'desc' },
        { malPopularity: 'desc' },
        { malFavorites: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'MyAnimeList';
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { scoredCount: 'desc' },
        { popularity: 'desc' },
        { favorites: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaMangaV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaMangaV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'anilist') extScore = item.alAverageScore;
      else if (source === 'mal') extScore = item.malAverageScore;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: item.format,
        status: item.status,
        year: item.startDateYear || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: item.popularity || item.alPopularity || item.malPopularity || 0,
        favorites: item.favorites || item.alFavorites || item.malFavorites || 0,
        scoredCount: item.scoredCount || 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  private async getMovieRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, status } = query;
    const where: Prisma.AquilaMovieV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) where.releaseDateYear = Number(year);
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as MovieStatus;
    }

    let orderBy: Prisma.AquilaMovieV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    let externalScoreMax = 100;

    if (source === 'imdb') {
      where.imdbRating = { not: null, gt: 0 };
      orderBy = [
        { imdbRating: 'desc' },
        { imdbVotes: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'IMDb';
      externalScoreMax = 10;
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { scoredCount: 'desc' },
        { popularity: 'desc' },
        { favorites: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaMovieV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaMovieV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'imdb') extScore = item.imdbRating;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: 'MOVIE',
        status: item.status,
        year: item.releaseDateYear || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: item.popularity || 0,
        favorites: item.favorites || 0,
        scoredCount: item.scoredCount || 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  private async getTvRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, status } = query;
    const where: Prisma.AquilaTvV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) where.firstAiredYear = Number(year);
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as TvStatus;
    }

    let orderBy: Prisma.AquilaTvV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    let externalScoreMax = 100;

    if (source === 'imdb') {
      where.imdbRating = { not: null, gt: 0 };
      orderBy = [
        { imdbRating: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'IMDb';
      externalScoreMax = 10;
    } else if (source === 'rottenTomatoes') {
      where.rottenTomatoesScore = { not: null, gt: 0 };
      orderBy = [
        { rottenTomatoesScore: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'Rotten Tomatoes';
      externalScoreMax = 100;
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { scoredCount: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaTvV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaTvV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'imdb') extScore = item.imdbRating;
      else if (source === 'rottenTomatoes') extScore = item.rottenTomatoesScore;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: 'TV',
        status: item.status,
        year: item.firstAiredYear || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: item.popularity || 0,
        scoredCount: item.scoredCount || 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  private async getGameRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, status } = query;
    const where: Prisma.AquilaGameV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) where.releaseDateYear = Number(year);
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as GameStatus;
    }

    let orderBy: Prisma.AquilaGameV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    let externalScoreMax = 100;

    if (source === 'metacritic') {
      where.metacriticScore = { not: null, gt: 0 };
      orderBy = [
        { metacriticScore: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'Metacritic';
      externalScoreMax = 100;
    } else if (source === 'igdb') {
      where.igdbRating = { not: null, gt: 0 };
      orderBy = [
        { igdbRating: 'desc' },
        { igdbRatingCount: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'IGDB';
      externalScoreMax = 100;
    } else if (source === 'rawg') {
      where.rawgRating = { not: null, gt: 0 };
      orderBy = [
        { rawgRating: 'desc' },
        { rawgRatingsCount: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'RAWG';
      externalScoreMax = 5;
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { scoredCount: 'desc' },
        { popularity: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaGameV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaGameV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'metacritic') extScore = item.metacriticScore;
      else if (source === 'igdb') extScore = item.igdbRating;
      else if (source === 'rawg') extScore = item.rawgRating;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: 'GAME',
        status: item.status,
        year: item.releaseDateYear || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: item.popularity || 0,
        scoredCount: item.scoredCount || 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  private async getBookRankings(
    query: RankingsQueryDto,
    skip: number,
    limit: number,
  ): Promise<{ items: RankedMediaItemEntity[]; totalCount: number }> {
    const { source = 'aquila', genres, year, format, status } = query;
    const where: Prisma.AquilaBookV2WhereInput = {};

    this.applyGenresFilter(where, genres);
    if (year) where.releaseDateYear = Number(year);
    if (format && format !== 'all') {
      where.format = { contains: format, mode: 'insensitive' };
    }
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as BookStatus;
    }

    let orderBy: Prisma.AquilaBookV2OrderByWithRelationInput[] = [];
    let externalScoreSource = 'Aquila';
    let externalScoreMax = 100;

    if (source === 'googleBooks') {
      where.googleBooksRating = { not: null, gt: 0 };
      orderBy = [
        { googleBooksRating: 'desc' },
        { googleBooksRatingsCount: 'desc' },
        { id: 'desc' },
      ];
      externalScoreSource = 'Google Books';
      externalScoreMax = 5;
    } else {
      where.averageScore = { not: null, gt: 0 };
      orderBy = [
        { averageScore: 'desc' },
        { id: 'desc' },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.client.aquilaBookV2.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.client.aquilaBookV2.count({ where }),
    ]);

    const items: RankedMediaItemEntity[] = data.map((item, index) => {
      let extScore: number | null = null;
      if (source === 'googleBooks') extScore = item.googleBooksRating;
      else extScore = item.averageScore;

      return {
        rank: skip + index + 1,
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || '',
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        bannerImage: item.bannerImage || null,
        format: item.format || 'BOOK',
        status: item.status,
        year: item.releaseDateYear || null,
        genres: Array.isArray(item.genres) ? item.genres : [],
        averageScore: item.averageScore || null,
        externalScore: extScore,
        externalScoreSource,
        externalScoreMax,
        popularity: 0,
        scoredCount: 0,
        isAdult: item.isAdult ?? false,
      };
    });

    return { items, totalCount };
  }

  // ---------------------------------------------------------------------------
  // Helper / Metadata Methods
  // ---------------------------------------------------------------------------

  private applyGenresFilter(where: any, genresParam?: string): void {
    if (!genresParam || genresParam.trim() === '' || genresParam === 'all') {
      return;
    }
    const genresList = genresParam
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);

    if (genresList.length === 1) {
      where.genres = { has: genresList[0] };
    } else if (genresList.length > 1) {
      where.genres = { hasSome: genresList };
    }
  }

  private getSourcesForType(type: RankingMediaType): RankingSourceOption[] {
    switch (type) {
      case 'anime':
      case 'manga':
        return [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'anilist', name: 'AniList Score', maxScore: 100 },
          { id: 'mal', name: 'MyAnimeList Score', maxScore: 100 },
        ];
      case 'movie':
        return [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'imdb', name: 'IMDb Rating', maxScore: 10 },
        ];
      case 'tv':
        return [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'imdb', name: 'IMDb Rating', maxScore: 10 },
          { id: 'rottenTomatoes', name: 'Rotten Tomatoes Score', maxScore: 100 },
        ];
      case 'game':
        return [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'metacritic', name: 'Metacritic Score', maxScore: 100 },
          { id: 'igdb', name: 'IGDB Rating', maxScore: 100 },
          { id: 'rawg', name: 'RAWG Rating', maxScore: 5 },
        ];
      case 'book':
        return [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'googleBooks', name: 'Google Books Rating', maxScore: 5 },
        ];
      default:
        return [{ id: 'aquila', name: 'Aquila Average Score', maxScore: 100 }];
    }
  }

  private async getGenresForType(type: RankingMediaType): Promise<string[]> {
    const defaultGenres = [
      'Action',
      'Adventure',
      'Comedy',
      'Drama',
      'Fantasy',
      'Horror',
      'Mystery',
      'Psychological',
      'Romance',
      'Sci-Fi',
      'Slice of Life',
      'Sports',
      'Supernatural',
      'Thriller',
    ];

    try {
      let records: { genres: string[] }[] = [];
      if (type === 'anime') {
        records = await this.prisma.client.aquilaAnimeV2.findMany({
          select: { genres: true },
          take: 500,
        });
      } else if (type === 'manga') {
        records = await this.prisma.client.aquilaMangaV2.findMany({
          select: { genres: true },
          take: 500,
        });
      } else if (type === 'movie') {
        records = await this.prisma.client.aquilaMovieV2.findMany({
          select: { genres: true },
          take: 500,
        });
      } else if (type === 'tv') {
        records = await this.prisma.client.aquilaTvV2.findMany({
          select: { genres: true },
          take: 500,
        });
      } else if (type === 'game') {
        records = await this.prisma.client.aquilaGameV2.findMany({
          select: { genres: true },
          take: 500,
        });
      } else if (type === 'book') {
        records = await this.prisma.client.aquilaBookV2.findMany({
          select: { genres: true },
          take: 500,
        });
      }

      const genresSet = new Set<string>(defaultGenres);
      for (const r of records) {
        if (Array.isArray(r.genres)) {
          for (const g of r.genres) {
            if (g && typeof g === 'string' && g.trim().length > 0) {
              genresSet.add(g.trim());
            }
          }
        }
      }
      return Array.from(genresSet).sort();
    } catch {
      return defaultGenres;
    }
  }

  private async getYearsForType(type: RankingMediaType): Promise<number[]> {
    let years: (number | null)[] = [];
    if (type === 'anime') {
      const data = await this.prisma.client.aquilaAnimeV2.findMany({
        select: { startDateYear: true },
        distinct: ['startDateYear'],
        orderBy: { startDateYear: 'desc' },
      });
      years = data.map((d) => d.startDateYear);
    } else if (type === 'manga') {
      const data = await this.prisma.client.aquilaMangaV2.findMany({
        where: { NOT: { startDateYear: null } },
        select: { startDateYear: true },
        distinct: ['startDateYear'],
        orderBy: { startDateYear: 'desc' },
      });
      years = data.map((d) => d.startDateYear);
    } else if (type === 'movie') {
      const data = await this.prisma.client.aquilaMovieV2.findMany({
        where: { NOT: { releaseDateYear: null } },
        select: { releaseDateYear: true },
        distinct: ['releaseDateYear'],
        orderBy: { releaseDateYear: 'desc' },
      });
      years = data.map((d) => d.releaseDateYear);
    } else if (type === 'tv') {
      const data = await this.prisma.client.aquilaTvV2.findMany({
        where: { NOT: { firstAiredYear: null } },
        select: { firstAiredYear: true },
        distinct: ['firstAiredYear'],
        orderBy: { firstAiredYear: 'desc' },
      });
      years = data.map((d) => d.firstAiredYear);
    } else if (type === 'game') {
      const data = await this.prisma.client.aquilaGameV2.findMany({
        where: { NOT: { releaseDateYear: null } },
        select: { releaseDateYear: true },
        distinct: ['releaseDateYear'],
        orderBy: { releaseDateYear: 'desc' },
      });
      years = data.map((d) => d.releaseDateYear);
    } else if (type === 'book') {
      const data = await this.prisma.client.aquilaBookV2.findMany({
        where: { NOT: { releaseDateYear: null } },
        select: { releaseDateYear: true },
        distinct: ['releaseDateYear'],
        orderBy: { releaseDateYear: 'desc' },
      });
      years = data.map((d) => d.releaseDateYear);
    }

    const filtered = years.filter((y): y is number => y !== null && y > 1900);
    if (filtered.length === 0) {
      const currentYear = new Date().getFullYear();
      return Array.from({ length: 30 }, (_, i) => currentYear - i);
    }
    return filtered;
  }

  private async getStatusesForType(type: RankingMediaType): Promise<string[]> {
    if (type === 'anime') {
      return Object.values(AnimeStatus).filter((s) => s !== 'UNKNOWN');
    } else if (type === 'manga') {
      return Object.values(MangaStatus).filter((s) => s !== 'UNKNOWN');
    } else if (type === 'movie') {
      return Object.values(MovieStatus);
    } else if (type === 'tv') {
      return Object.values(TvStatus).filter((s) => s !== 'UNKNOWN');
    } else if (type === 'game') {
      return Object.values(GameStatus).filter((s) => s !== 'UNKNOWN');
    } else if (type === 'book') {
      return Object.values(BookStatus).filter((s) => s !== 'UNKNOWN');
    }
    return [];
  }
}
