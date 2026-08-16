import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import {
  StudioDetailEntity,
  StudioMediaRelease,
  StudioSearchEntity,
} from './studio.entities';
import { rrError } from 'src/providers/error';
import { MediaType } from '@runa/database';

@Injectable()
export class StudioRepository {
  private readonly moduleCode = 'StRpsty-';
  private readonly logger = new Logger(StudioRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async find(id: number): Promise<StudioDetailEntity | null> {
    this.logger.debug(`Fetching studio details for ID: ${id}`);
    try {
      const numericId = typeof id === 'number' ? id : Number(id);
      if (isNaN(numericId)) return null;

      let studio = await this.prisma.client.aquilaStudioV2.findUnique({
        where: { id: numericId },
        include: {
          mediaStudios: true,
        },
      });

      if (!studio) {
        studio = await this.prisma.client.aquilaStudioV2.findUnique({
          where: { anilistId: numericId },
          include: {
            mediaStudios: true,
          },
        });
      }

      if (!studio) return null;

      const releases: StudioMediaRelease[] = [];

      for (const ms of studio.mediaStudios) {
        if (ms.mediaType === MediaType.ANIME || ms.animeId) {
          const targetId = ms.animeId ?? ms.mediaId;
          const anime = await this.prisma.client.aquilaAnimeV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              format: true,
              status: true,
              startDateYear: true,
              startDateMonth: true,
              startDateDay: true,
              seasonYear: true,
              averageScore: true,
            },
          });
          if (anime) {
            releases.push({
              id: anime.id,
              mediaType: 'ANIME',
              titlePrimary: anime.titlePrimary,
              titleSecondary: anime.titleSecondary,
              coverImage: anime.coverImage,
              format: anime.format,
              status: anime.status,
              year: anime.startDateYear || anime.seasonYear || null,
              month: anime.startDateMonth || null,
              day: anime.startDateDay || null,
              isMain: ms.isMain,
              averageScore: anime.averageScore,
            });
          }
        } else if (ms.mediaType === MediaType.MOVIE || ms.movieId) {
          const targetId = ms.movieId ?? ms.mediaId;
          const movie = await this.prisma.client.aquilaMovieV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              status: true,
              releaseDateYear: true,
              releaseDateMonth: true,
              releaseDateDay: true,
              averageScore: true,
            },
          });
          if (movie) {
            releases.push({
              id: movie.id,
              mediaType: 'MOVIE',
              titlePrimary: movie.titlePrimary,
              titleSecondary: movie.titleSecondary,
              coverImage: movie.coverImage,
              format: 'MOVIE',
              status: movie.status,
              year: movie.releaseDateYear || null,
              month: movie.releaseDateMonth || null,
              day: movie.releaseDateDay || null,
              isMain: ms.isMain,
              averageScore: movie.averageScore,
            });
          }
        } else if (ms.mediaType === MediaType.TV || ms.tvId) {
          const targetId = ms.tvId ?? ms.mediaId;
          const tv = await this.prisma.client.aquilaTvV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              status: true,
              firstAiredYear: true,
              firstAiredMonth: true,
              firstAiredDay: true,
              averageScore: true,
            },
          });
          if (tv) {
            releases.push({
              id: tv.id,
              mediaType: 'TV',
              titlePrimary: tv.titlePrimary,
              titleSecondary: tv.titleSecondary,
              coverImage: tv.coverImage,
              format: 'TV',
              status: tv.status,
              year: tv.firstAiredYear || null,
              month: tv.firstAiredMonth || null,
              day: tv.firstAiredDay || null,
              isMain: ms.isMain,
              averageScore: tv.averageScore,
            });
          }
        } else if (ms.mediaType === MediaType.GAME || ms.gameId) {
          const targetId = ms.gameId ?? ms.mediaId;
          const game = await this.prisma.client.aquilaGameV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              status: true,
              releaseDateYear: true,
              releaseDateMonth: true,
              releaseDateDay: true,
              releaseDate: true,
              averageScore: true,
            },
          });
          if (game) {
            const year =
              game.releaseDateYear ||
              (game.releaseDate ? new Date(game.releaseDate).getFullYear() : null);
            const month =
              game.releaseDateMonth ||
              (game.releaseDate ? new Date(game.releaseDate).getMonth() + 1 : null);
            const day =
              game.releaseDateDay ||
              (game.releaseDate ? new Date(game.releaseDate).getDate() : null);

            releases.push({
              id: game.id,
              mediaType: 'GAME',
              titlePrimary: game.titlePrimary,
              titleSecondary: game.titleSecondary,
              coverImage: game.coverImage,
              format: 'GAME',
              status: game.status,
              year,
              month,
              day,
              isMain: ms.isMain,
              averageScore: game.averageScore,
            });
          }
        } else if (ms.mediaType === MediaType.MANGA || ms.mangaId) {
          const targetId = ms.mangaId ?? ms.mediaId;
          const manga = await this.prisma.client.aquilaMangaV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              format: true,
              status: true,
              startDateYear: true,
              startDateMonth: true,
              startDateDay: true,
              averageScore: true,
            },
          });
          if (manga) {
            releases.push({
              id: manga.id,
              mediaType: 'MANGA',
              titlePrimary: manga.titlePrimary,
              titleSecondary: manga.titleSecondary,
              coverImage: manga.coverImage,
              format: manga.format,
              status: manga.status,
              year: manga.startDateYear || null,
              month: manga.startDateMonth || null,
              day: manga.startDateDay || null,
              isMain: ms.isMain,
              averageScore: manga.averageScore,
            });
          }
        } else if (ms.mediaType === MediaType.BOOK || ms.bookId) {
          const targetId = ms.bookId ?? ms.mediaId;
          const book = await this.prisma.client.aquilaBookV2.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              titlePrimary: true,
              titleSecondary: true,
              coverImage: true,
              status: true,
              releaseDateYear: true,
              releaseDateMonth: true,
              releaseDateDay: true,
              releaseDate: true,
              averageScore: true,
            },
          });
          if (book) {
            const year =
              book.releaseDateYear ||
              (book.releaseDate ? new Date(book.releaseDate).getFullYear() : null);
            const month =
              book.releaseDateMonth ||
              (book.releaseDate ? new Date(book.releaseDate).getMonth() + 1 : null);
            const day =
              book.releaseDateDay ||
              (book.releaseDate ? new Date(book.releaseDate).getDate() : null);

            releases.push({
              id: book.id,
              mediaType: 'BOOK',
              titlePrimary: book.titlePrimary,
              titleSecondary: book.titleSecondary,
              coverImage: book.coverImage,
              format: 'BOOK',
              status: book.status,
              year,
              month,
              day,
              isMain: ms.isMain,
              averageScore: book.averageScore,
            });
          }
        }
      }

      // Sort releases by year descending (nulls at the end), then month/day
      releases.sort((a, b) => {
        if (a.year === null && b.year === null) return 0;
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        if (b.year !== a.year) return b.year - a.year;

        const aMonth = a.month ?? 0;
        const bMonth = b.month ?? 0;
        if (bMonth !== aMonth) return bMonth - aMonth;

        const aDay = a.day ?? 0;
        const bDay = b.day ?? 0;
        return bDay - aDay;
      });

      return {
        id: studio.id,
        anilistId: studio.anilistId,
        malId: studio.malId,
        aniDBId: studio.aniDBId,
        tvDBId: studio.tvDBId,
        bangumiId: studio.bangumiId,
        name: studio.name,
        isAnimationStudio: studio.isAnimationStudio,
        siteUrl: studio.siteUrl,
        favorites: studio.favorites,
        alFavorites: studio.alFavorites,
        releases,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch studio ${id} from database: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTFS001`, {
        message: 'Failed to fetch studio details from database',
      });
    }
  }

  public async search(query: string): Promise<StudioSearchEntity[]> {
    this.logger.debug(`Searching studios for query: ${query}`);
    try {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const data = await this.prisma.client.aquilaStudioV2.findMany({
        where: {
          name: { contains: trimmed, mode: 'insensitive' },
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        anilistId: item.anilistId,
        malId: item.malId,
        title: item.name,
        secondaryTitle: null,
        coverImage: null,
        isAnimationStudio: item.isAnimationStudio,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search studios: ${err.message}`);
      throw new rrError(`${this.moduleCode}SRCH001`, {
        message: 'Failed to search studios in database',
      });
    }
  }
}
