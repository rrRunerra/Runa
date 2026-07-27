import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import { MovieEntity, MovieSearchEntity } from './movie.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class MovieRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'MoRpstry-';
  private readonly logger = new Logger(MovieRepository.name);

  public async search(name: string): Promise<MovieSearchEntity[]> {
    this.logger.debug(`Searching for movies: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaMovie.findMany({
        where: {
          OR: [
            { titleEnglish: { search: query } },
            { titleRomaji: { search: query } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titleEnglish || item.titleRomaji || '',
        secondaryTitle: item.titleRomaji || null,
        coverImage: item.coverImage || null,
        averageScore: null,
        isAdult: false,
        format: 'MOVIE',
        status: item.status || 'RELEASED',
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch movies from db',
      });
    }
  }

  public async find(id: number): Promise<MovieEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    const result = await this.prisma.client.aquilaMovie.findUnique({
      where: { id: numericId },
      include: {
        movieCharacters: {
          include: {
            character: true,
            actor: true,
          },
        },
      },
    });

    if (!result) return null;

    return {
      id: result.id,
      tvdbId: result.tvdbId,
      tmdbId: result.tmdbId,
      imdbId: result.imdbId,
      titleEnglish: result.titleEnglish,
      titleRomaji: result.titleRomaji,
      titleNative: result.titleNative,
      coverImage: result.coverImage,
      bannerImage: result.bannerImage,
      description: result.description,
      slug: result.slug,
      releaseDate: result.releaseDate,
      status: result.status,
      runtime: result.runtime,
      budget: result.budget,
      boxOffice: result.boxOffice,
      genres: result.genres,
      studios: result.studios,
      characters:
        result.movieCharacters?.map((mc) => ({
          id: mc.character.id,
          name: mc.character.nameFirst || '',
          personName: mc.actor?.personName || '',
          image: mc.character.image || mc.actor?.image || null,
          role: mc.role || null,
          actorId: mc.actor?.id || null,
        })) ?? null,
      trailers: (result.trailers ?? null) as MovieEntity['trailers'],
      originalCountry: result.originalCountry,
      originalLanguage: result.originalLanguage,
      contentRating: result.contentRating,
      startDateYear: result.startDateYear,
      startDateMonth: result.startDateMonth,
      startDateDay: result.startDateDay,
      locked: result.locked,
      updatedAt: result.updatedAt,
      localPopularity: result.localPopularity ?? 0,
      localFavoritesCount: result.localFavoritesCount ?? 0,
      localAverageScore: result.localAverageScore ?? 0,
      localStatusDistribution:
        (result.localStatusDistribution as Record<string, number>) ?? {},
      localScoreDistribution:
        (result.localScoreDistribution as Record<string, number>) ?? {},
    };
  }

  public async findByTvdbId(tvdbId: number): Promise<any> {
    return this.prisma.client.aquilaMovie.findUnique({
      where: { tvdbId },
    });
  }

  public async upsert(
    tvdbId: number,
    data: Prisma.AquilaMovieCreateInput,
  ): Promise<any> {
    const existing = await this.prisma.client.aquilaMovie.findUnique({
      where: { tvdbId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      return existing;
    }

    return this.prisma.client.aquilaMovie.upsert({
      where: { tvdbId },
      update: data,
      create: data,
    });
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaMovie.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titleEnglish: true,
          titleRomaji: true,
          genres: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titleEnglish || target.titleRomaji || '';
      const firstWord = targetTitle.trim().split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (titleKey) {
        whereConditions.push({ titleEnglish: { contains: titleKey, mode: 'insensitive' } });
        whereConditions.push({ titleRomaji: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaMovie.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titleEnglish: true,
          titleRomaji: true,
          coverImage: true,
          genres: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaMovie.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titleEnglish: true,
            titleRomaji: true,
            coverImage: true,
            genres: true,
          },
          take: 12,
        });

        const existingIds = new Set(candidates.map((c) => c.id));
        for (const fb of fallback) {
          if (!existingIds.has(fb.id)) {
            candidates.push(fb);
          }
        }
      }

      const scored = candidates.map((item) => {
        let score = 0;
        const itemTitle = (item.titleEnglish || item.titleRomaji || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titleEnglish || item.titleRomaji || 'Untitled',
        coverImage: item.coverImage || null,
        type: 'MOVIE',
      }));
    } catch (err) {
      this.logger.error(`Movie findSimilar error: ${err}`);
      return [];
    }
  }
}


