import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import { GameEntity, GameSearchEntity } from './game.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class GameRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'GeRpstry-';
  private readonly logger = new Logger(GameRepository.name);

  public async search(name: string): Promise<GameSearchEntity[]> {
    this.logger.debug(`Searching for games: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaGame.findMany({
        where: {
          OR: [
            { titleString: { search: query } },
            { titleNative: { search: query } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titleString || '',
        secondaryTitle: item.titleNative || null,
        coverImage: item.coverImage || null,
        averageScore: item.averageScore ?? null,
        isAdult:
          item.esrbRating === 'mature' || item.esrbRating === 'adults-only',
        format: 'GAME',
        status: item.released ? 'RELEASED' : 'TBA',
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch games from db',
      });
    }
  }

  public async find(id: number): Promise<GameEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    const result = await this.prisma.client.aquilaGame.findUnique({
      where: { id: numericId },
    });

    if (!result) return null;

    return {
      id: result.id,
      rawgId: result.rawgId,
      titleString: result.titleString,
      titleNative: result.titleNative,
      slug: result.slug,
      coverImage: result.coverImage,
      backgroundImage: result.backgroundImage,
      description: result.description,
      releasedYear: result.releasedYear,
      releasedMonth: result.releasedMonth,
      releasedDay: result.releasedDay,
      released: result.released,
      genres: result.genres,
      platforms: result.platforms,
      developers: result.developers,
      publishers: result.publishers,
      averageScore: result.averageScore,
      popularity: result.popularity,
      metacritic: result.metacritic,
      rating: result.rating,
      ratingsCount: result.ratingsCount,
      esrbRating: result.esrbRating,
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

  public async findByRawgId(
    rawgId: number,
  ): Promise<Prisma.AquilaGameGetPayload<object> | null> {
    return this.prisma.client.aquilaGame.findUnique({
      where: { rawgId },
    });
  }

  public async upsert(
    rawgId: number,
    data: Prisma.AquilaGameCreateInput,
  ): Promise<{ id: number }> {
    const existing = await this.prisma.client.aquilaGame.findUnique({
      where: { rawgId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      return { id: existing.id };
    }

    return this.prisma.client.aquilaGame.upsert({
      where: { rawgId },
      update: data,
      create: data,
      select: { id: true },
    });
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaGame.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titleString: true,
          titleNative: true,
          genres: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titleString || target.titleNative || '';
      const firstWord = targetTitle.trim().split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (titleKey) {
        whereConditions.push({ titleString: { contains: titleKey, mode: 'insensitive' } });
        whereConditions.push({ titleNative: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaGame.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titleString: true,
          titleNative: true,
          coverImage: true,
          genres: true,
          averageScore: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaGame.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titleString: true,
            titleNative: true,
            coverImage: true,
            genres: true,
            averageScore: true,
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
        const itemTitle = (item.titleString || item.titleNative || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        if (item.averageScore) {
          score += item.averageScore / 20;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titleString || item.titleNative || 'Untitled',
        coverImage: item.coverImage || null,
        type: 'GAME',
      }));
    } catch (err) {
      this.logger.error(`Game findSimilar error: ${err}`);
      return [];
    }
  }
}


