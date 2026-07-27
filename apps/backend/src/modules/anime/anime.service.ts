import { Injectable, Logger } from '@nestjs/common';
import { AnimeRepository } from './anime.repository';
import { AnimeQueueService } from './anime-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
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
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    const cacheKey = CacheService.keys.animeSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: AnimeSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached)) {
      this.logger.debug(`Anime search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: AnimeSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.animeRepository.search(cleanName);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.animeExternal.search(cleanName);
      usedExternal = true;
    }

    this.logger.debug(`Anime found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug(`Queuing background refresh for anime`);
      this.animeQueueService.addSearchRefresh(cleanName, cacheKey);
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
    force = false,
  ): Promise<AnimeEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:anime:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
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

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Anime is locked, cannot refresh',
      });
    }

    // Fetch fresh data from AniList
    await this.animeExternal.fetchAndUpsertAnime(
      existing.anilistId,
      ...(force ? [force] : []),
    );

    // Bust the cache so next getAnime fetches fresh data
    await this.cacheService.del(`anime:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.animeRepository.find(id);
  }

  public async ensureAnime(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    // Check if already in DB by anilistId
    let anime = await this.animeRepository.findByAnilistId(anilistId);
    if (!anime) {
      try {
        await this.animeExternal.fetchAndUpsertAnime(anilistId);
        anime = await this.animeRepository.findByAnilistId(anilistId);
      } catch {
        // AniList fetch failed — write minimal stub so the list entry can be created
        this.logger.warn(
          `ensureAnime: AniList fetch failed for ${anilistId}, writing stub`,
        );
        anime = await this.animeRepository.upsert(anilistId, {
          malId: malId ?? null,
          titleRomaji: title || 'Unknown',
          coverImageLarge: coverImage ?? null,
        });
      }
    }
    return anime;
  }

  public async getSimilarAnime(id: number): Promise<any[]> {
    if (isNaN(id)) {
      return [];
    }
    const cacheKey = `anime:similar:${id}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    const result = await this.animeRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }
}

