import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { Media, SearchMedia } from '../../common/types/types';
import { GameRepository } from './repositories/game.repository';
import { GameQueueService } from './services/game-queue.service';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gameRepository: GameRepository,
    private readonly gameQueueService: GameQueueService,
  ) {}

  private getApiKey(): string {
    const key = process.env.RAWG_API_KEY;
    if (!key) {
      this.logger.warn('RAWG_API_KEY is not defined in environment variables');
    }
    return key || '';
  }

  public async search(name: string): Promise<SearchMedia[]> {
    const key = this.getApiKey();
    if (!key) {
      return [];
    }

    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(name)}&page_size=20`,
      );
      if (!res.ok) {
        throw new Error(`RAWG search failed: ${res.status}`);
      }
      const data = await res.json();
      const results = data.results || [];

      return results.map((item: any) => ({
        id: item.id.toString(),
        title: {
          romaji: item.name,
          english: item.name,
        },
        coverImage: {
          large: item.background_image || '',
        },
        format: 'Game',
        status: item.released ? 'Released' : 'TBA',
        isAdult: item.esrb_rating?.slug === 'mature' || item.esrb_rating?.slug === 'adults-only',
      }));
    } catch (error) {
      this.logger.error('Failed to search RAWG games', error);
      return [];
    }
  }

  public async getGame(id: number): Promise<Media> {
    if (isNaN(id)) {
      throw new Error(`Invalid game ID: ${id}`);
    }

    const dbGame = await this.gameRepository.findByRawgId(id);

    if (dbGame) {
      const now = new Date();
      const updatedAt = new Date(dbGame.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS) {
        return this.gameRepository.toMedia(dbGame);
      }
    }

    try {
      const media = await this.fetchFromRawg(id);
      
      this.gameQueueService.addJob(id);

      return media;
    } catch (error) {
      if (dbGame) {
        return this.gameRepository.toMedia(dbGame);
      }
      throw new NotFoundException(`Game with ID ${id} not found`);
    }
  }

  private async fetchFromRawg(id: number): Promise<Media> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('RAWG_API_KEY is not defined');
    }

    const res = await fetch(`https://api.rawg.io/api/games/${id}?key=${key}`);
    if (!res.ok) {
      throw new Error(`RAWG detail fetch failed: ${res.status}`);
    }
    const item = await res.json();

    let releaseYear: number | null = null;
    let releaseMonth: number | null = null;
    let releaseDay: number | null = null;

    if (item.released) {
      const parts = item.released.split('-');
      if (parts.length === 3) {
        releaseYear = parseInt(parts[0], 10);
        releaseMonth = parseInt(parts[1], 10);
        releaseDay = parseInt(parts[2], 10);
      }
    }

    const developers = (item.developers || []).map((d: any) => d.name);
    const genres = (item.genres || []).map((g: any) => g.name);
    const platforms = (item.platforms || []).map((p: any) => p.platform.name);

    // Combine platforms into formats or genres cleanly
    const allPlatforms = platforms.map((p: string) => `Platform: ${p}`);

    return {
      id: item.id.toString(),
      title: {
        romaji: item.name,
        english: item.name,
        native: null,
      },
      coverImage: {
        extraLarge: item.background_image_additional || item.background_image || '',
        large: item.background_image || '',
      },
      bannerImage: item.background_image || '',
      format: 'Game',
      status: item.released ? 'Released' : 'TBA',
      description: item.description || item.description_raw || '',
      startDate: releaseYear
        ? {
            year: releaseYear,
            month: releaseMonth,
            day: releaseDay,
          }
        : undefined,
      genres: [...allPlatforms, ...genres],
      studios: developers.map((name: string) => ({ name })),
      averageScore: item.metacritic || (item.rating ? Math.round(item.rating * 20) : null), // map 5 stars to 100
      popularity: item.added || null,
    };
  }
}
