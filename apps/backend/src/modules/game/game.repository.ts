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
    const result = await this.prisma.client.aquilaGame.findUnique({
      where: { id },
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
      tags: result.tags as Record<string, unknown> | null,
      averageScore: result.averageScore,
      popularity: result.popularity,
      metacritic: result.metacritic,
      rating: result.rating,
      ratingsCount: result.ratingsCount,
      esrbRating: result.esrbRating,
      locked: result.locked,
      updatedAt: result.updatedAt,
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
    return this.prisma.client.aquilaGame.upsert({
      where: { rawgId },
      update: data,
      create: data,
      select: { id: true },
    });
  }
}
