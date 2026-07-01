import { Injectable, Logger } from '@nestjs/common';
import { AnimeRepository } from './anime.repository';
import { AnimeQueueService } from './anime-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
} from 'src/providers/error';
import { AnimeEntity, AnimeSearchEntity } from './anime.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { AnimeExternal } from './anime.external';

@Injectable()
export class AnimeService {
  private readonly logger = new Logger(AnimeService.name);
  private readonly moduleCode = 'AeSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
  private readonly cacheDuration = Number(
    process.env.ANIME_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeQueueService: AnimeQueueService,
    private readonly cacheService: CacheService,
    private readonly animeExternal: AnimeExternal,
  ) {}

  public async search(name: string): Promise<AnimeSearchEntity[]> {
    const normalized = name.trim().toLowerCase();
    const cacheKey = `anime-search:${normalized.replaceAll(' ', '')}`;

    const cached = await this.cacheService.get<AnimeSearchEntity[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Anime search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: AnimeSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.animeRepository.search(name);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.animeExternal.search(name);
      usedExternal = true;
    }

    this.logger.debug(`Anime found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(result),
        this.cacheDuration,
      );
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug(`Queuing background refresh for anime`);
      this.animeQueueService.addSearchRefresh(name, cacheKey);
    }

    return result;
  }

  public async getAnime(id: number): Promise<AnimeEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `anime:${id}`;
    const cached = await this.cacheService.get<AnimeEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getAnime cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getAnime fetching from db`);
    const data = await this.animeRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}ANF001`, {
        message: `Anime not found`,
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshAnime(
    id: number,
  ): Promise<AnimeEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:anime:${id}`;
    const onCooldown = await this.cacheService.get(cacheKey);

    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message: 'This media was refreshed recently.',
      });
    }

    // Look up the existing entry to get the AniList ID
    const existing = await this.animeRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}ANFID001`, {
        message: 'Anime not found in database',
      });
    }
    if (!existing.anilistId) {
      throw new rrError(`${this.moduleCode}AHNAICR001`, {
        message: 'Anime has no AniList ID, cannot refresh',
      });
    }

    // Fetch fresh data from AniList
    await this.animeExternal.fetchAndUpsertAnime(existing.anilistId);

    // Bust the cache so next getAnime fetches fresh data
    await this.cacheService.del(`anime:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.animeRepository.find(id);
  }

  // public async ensureAnime(
  //   anilistId: number,
  //   malId?: number | null,
  //   title?: string,
  //   coverImage?: string,
  // ): Promise<any> {
  //   let anime = await this.animeRepository.findByAnilistId(anilistId);
  //   if (!anime) {
  //     anime = await this.animeRepository.upsert(anilistId, {
  //       anilistId,
  //       malId: malId || null,
  //       titleRomaji: title || 'Unknown',
  //       coverImageLarge: coverImage || '',
  //     });
  //     this.animeQueueService.addJob(anilistId);
  //   } else if (malId && !anime.malId) {
  //     anime = await this.animeRepository.upsert(anilistId, {
  //       malId,
  //     });
  //   }
  //   return anime;
  // }
}
