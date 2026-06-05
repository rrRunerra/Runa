import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { GameRepository } from '../repositories/game.repository';
import type { Media } from '../../../common/types/types';

@Injectable()
export class GameQueueService implements OnModuleInit {
  private readonly logger = new Logger(GameQueueService.name);
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly gameRepository: GameRepository) {}

  onModuleInit() {
    this.processQueue();
  }

  addJob(id: number) {
    if (!this.processing.has(id)) {
      this.jobQueue.next(id);
    }
  }

  private getApiKey(): string {
    const key = process.env.RAWG_API_KEY;
    if (!key) {
      this.logger.warn('RAWG_API_KEY is not defined in environment variables');
    }
    return key || '';
  }

  private processQueue() {
    this.jobQueue
      .pipe(
        mergeMap(async (id) => {
          if (this.processing.has(id)) {
            return;
          }

          this.processing.add(id);

          try {
            this.logger.log(`Processing sync job for game ${id}`);
            await this.syncGameFromRawg(id);
            this.logger.log(`Completed sync job for game ${id}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync game ${id}: ${message}`);
          } finally {
            this.processing.delete(id);
          }
        }, 3),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncGameFromRawg(id: number) {
    const media = await this.fetchFromRawg(id);
    if (media) {
      const releaseDate = media.startDate;
      await this.gameRepository.upsert(id, {
        rawgId: id,
        titleString: media.title.english || media.title.romaji || '',
        coverImage: media.coverImage.large || '',
        description: media.description || '',
        releasedYear: releaseDate?.year || null,
        releasedMonth: releaseDate?.month || null,
        releasedDay: releaseDate?.day || null,
        genres: media.genres?.filter((g: string) => !g.startsWith('Platform:')) || [],
        platforms: media.genres?.filter((g: string) => g.startsWith('Platform:')).map((g: string) => g.replace('Platform: ', '')) || [],
        developers: media.studios?.map((s: any) => s.name) || [],
        publishers: [],
        averageScore: media.averageScore || null,
        popularity: media.popularity || null,
      });
    }
  }

  private async fetchFromRawg(id: number): Promise<Media | null> {
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
      averageScore: item.metacritic || (item.rating ? Math.round(item.rating * 20) : null),
      popularity: item.added || null,
    };
  }
}
