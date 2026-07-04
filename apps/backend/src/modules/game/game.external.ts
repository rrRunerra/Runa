import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { Prisma } from '@runa/database';
import type { GameSearchEntity } from './game.entities';
import type { RawgSearchResponse, RawgGameDetail } from './game.types';

@Injectable()
export class GameExternal {
  private readonly logger = new Logger(GameExternal.name);
  private readonly moduleCode = 'GeExt-';
  private readonly baseUrl = 'https://api.rawg.io/api';

  constructor(private readonly prisma: PrismaService) {}

  private getApiKey(): string {
    const key = process.env.RAWG_API_KEY;
    if (!key) {
      throw new rrError(`${this.moduleCode}AKNF001`, {
        message: 'RAWG_API_KEY is not defined in environment variables',
      });
    }
    return key;
  }

  private static parseReleased(released: string | undefined): {
    releasedYear: number | null;
    releasedMonth: number | null;
    releasedDay: number | null;
    releasedStr: string | null;
  } {
    if (!released) {
      return {
        releasedYear: null,
        releasedMonth: null,
        releasedDay: null,
        releasedStr: null,
      };
    }

    const parts = released.split('-');
    if (parts.length !== 3) {
      return {
        releasedYear: null,
        releasedMonth: null,
        releasedDay: null,
        releasedStr: released,
      };
    }

    return {
      releasedYear: parseInt(parts[0], 10) || null,
      releasedMonth: parseInt(parts[1], 10) || null,
      releasedDay: parseInt(parts[2], 10) || null,
      releasedStr: released,
    };
  }

  private static cleanHtml(description: string | undefined): string | null {
    if (!description) return null;
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .trim();
  }

  private static mapTags(
    tags: { name: string; slug: string }[] | undefined,
  ): Prisma.InputJsonValue {
    if (!tags || tags.length === 0) {
      return Prisma.DbNull as unknown as Prisma.InputJsonValue;
    }
    const record: Record<string, string> = {};
    for (const tag of tags) {
      record[tag.slug] = tag.name;
    }
    return record as unknown as Prisma.InputJsonValue;
  }

  public async search(query: string): Promise<GameSearchEntity[]> {
    try {
      this.logger.debug('Searching for games in RAWG');
      const key = this.getApiKey();
      const url = `${this.baseUrl}/games?key=${key}&search=${encodeURIComponent(query)}&page_size=20`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new rrError(`${this.moduleCode}SRCHF001`, {
          message: `RAWG search failed with status ${res.status}`,
        });
      }

      const data = (await res.json()) as RawgSearchResponse;
      const results = data.results || [];

      const mapped = await Promise.all(
        results.map(async (item) => {
          const dbGame = await this.prisma.client.aquilaGame.upsert({
            where: { rawgId: item.id },
            update: {
              titleString: item.name,
              coverImage: item.background_image || null,
              released: item.released || null,
              rating: item.rating || null,
              ratingsCount: item.ratings_count || null,
              metacritic: item.metacritic || null,
              slug: item.slug || null,
            },
            create: {
              rawgId: item.id,
              titleString: item.name,
              coverImage: item.background_image || null,
              released: item.released || null,
              rating: item.rating || null,
              ratingsCount: item.ratings_count || null,
              metacritic: item.metacritic || null,
              slug: item.slug || null,
            },
            select: {
              id: true,
              titleString: true,
              titleNative: true,
              coverImage: true,
            },
          });

          this.queueFetch(item.id);

          const esrbSlug = item.esrb_rating?.slug;
          const isAdult = esrbSlug === 'mature' || esrbSlug === 'adults-only';

          return {
            id: dbGame.id,
            title: dbGame.titleString || item.name,
            secondaryTitle: dbGame.titleNative || null,
            coverImage: dbGame.coverImage || item.background_image || null,
            format: 'GAME',
            status: item.released ? 'RELEASED' : 'TBA',
            isAdult,
            averageScore: item.metacritic ?? null,
          } as GameSearchEntity;
        }),
      );

      return mapped;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search games in RAWG: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSG001`, {
        message: 'Failed to search games in RAWG',
      });
    }
  }

  public async fetchAndUpsertGame(rawgId: number): Promise<void> {
    try {
      const key = this.getApiKey();
      const url = `${this.baseUrl}/games/${rawgId}?key=${key}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new rrError(`${this.moduleCode}FTFFG001`, {
          message: `RAWG detail fetch failed for ${rawgId}: ${res.status}`,
        });
      }

      const game = (await res.json()) as RawgGameDetail;
      await this.upsertGame(game);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch game ${rawgId} from RAWG: ${message}`);
      throw new rrError(`${this.moduleCode}FTFFG002`, {
        message: 'Failed to fetch game from RAWG',
      });
    }
  }

  private queueFetch(rawgId: number): void {
    this.fetchAndUpsertGame(rawgId).catch((err: Error) =>
      this.logger.warn(
        `Background fetch failed for game ${rawgId}: ${err.message}`,
      ),
    );
  }

  private async upsertGame(game: RawgGameDetail): Promise<void> {
    const released = GameExternal.parseReleased(game.released);
    const description = GameExternal.cleanHtml(
      game.description_raw || game.description,
    );
    const esrbRating = game.esrb_rating?.slug || null;

    const genres = (game.genres || []).map((g) => g.name);
    const platforms = (game.platforms || []).map((p) => p.platform.name);
    const developers = (game.developers || []).map((d) => d.name);
    const publishers = (game.publishers || []).map((p) => p.name);

    await this.prisma.client.aquilaGame.upsert({
      where: { rawgId: game.id },
      update: {
        titleString: game.name,
        titleNative: game.name_original || null,
        slug: game.slug || null,
        coverImage: game.background_image || null,
        backgroundImage: game.background_image || game.background_image_additional || null,
        description,
        releasedYear: released.releasedYear,
        releasedMonth: released.releasedMonth,
        releasedDay: released.releasedDay,
        released: released.releasedStr,
        genres,
        platforms,
        developers,
        publishers,
        tags: GameExternal.mapTags(game.tags),
        averageScore: game.metacritic ?? null,
        popularity: game.added || null,
        metacritic: game.metacritic ?? null,
        rating: game.rating ?? null,
        ratingsCount: game.ratings_count ?? null,
        esrbRating,
      },
      create: {
        rawgId: game.id,
        titleString: game.name,
        titleNative: game.name_original || null,
        slug: game.slug || null,
        coverImage: game.background_image || null,
        backgroundImage: game.background_image_additional || null,
        description,
        releasedYear: released.releasedYear,
        releasedMonth: released.releasedMonth,
        releasedDay: released.releasedDay,
        released: released.releasedStr,
        genres,
        platforms,
        developers,
        publishers,
        tags: GameExternal.mapTags(game.tags),
        averageScore: game.metacritic ?? null,
        popularity: game.added || null,
        metacritic: game.metacritic ?? null,
        rating: game.rating ?? null,
        ratingsCount: game.ratings_count ?? null,
        esrbRating,
      },
    });
  }
}
