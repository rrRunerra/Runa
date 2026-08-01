import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AnimeRepository } from './anime.repository';
import { AnimeQueueService } from './anime-queue.service';
import { AnimeEntity, AnimeSearchEntity } from './anime.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { AnimeExternal } from './anime.external';
import { MangaQueueService } from '../manga/manga-queue.service';

@Injectable()
export class AnimeService {
  public static readonly cacheKeys = {
    animeSearch: (name: string) => `anime:v2:search:${name.toLowerCase().trim()}`,
    animeDetail: (id: number) => `anime:v2:${id}`,
    animeSimilar: (id: number) => `anime:v2:similar:${id}`,
    refreshCooldown: (id: number) => `cooldown:refresh:anime:v2:${id}`,
  };

  public readonly cacheKeys = AnimeService.cacheKeys;

  private readonly logger = new Logger(AnimeService.name);
  private readonly cacheDuration = Number(
    process.env.ANIME_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly animeRepository: AnimeRepository,
    private readonly animeQueueService: AnimeQueueService,
    private readonly cacheService: CacheService,
    private readonly animeExternal: AnimeExternal,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
  ) {}

  public async search(name: string): Promise<AnimeSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = this.cacheKeys.animeSearch(cleanName);
    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: AnimeSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`Anime V2 search cache hit (${cached.length} entries)`);
      return cached;
    }

    // 1. localFirst: Search local database first
    let result = await this.animeRepository.search(cleanName);

    // 2. If nothing found in local DB, search AniList external API
    if (result.length === 0) {
      this.logger.debug(
        `Local search returned 0 results for "${cleanName}". Fetching from AniList...`,
      );
      const externalResults = await this.animeExternal.search(cleanName);

      if (externalResults.length > 0) {
        result = await Promise.all(
          externalResults.map(async (item) => {
            const dbRecord = await this.animeRepository.upsertV2Record({
              anilistId: item.id,
              titlePrimary: item.title,
              titleSecondary: item.secondaryTitle,
              coverImage: item.coverImage,
              format: item.format,
              status: item.status,
              seasonYear: item.seasonYear || 1970,
              startDateYear: item.seasonYear || 1970,
            });
            void this.animeQueueService.addUpsertJob(item.id);

            return {
              id: dbRecord.id,
              anilistId: item.id,
              title: item.title,
              secondaryTitle: item.secondaryTitle,
              coverImage: item.coverImage,
              averageScore: item.averageScore,
              isAdult: item.isAdult,
              format: item.format,
              status: item.status,
            };
          }),
        );
      }
    }

    this.logger.debug(`Anime V2 search found ${result.length} items`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getAnime(id: number): Promise<AnimeEntity> {
    if (isNaN(id)) {
      throw new BadRequestException('ID must be a number');
    }

    const cacheKey = this.cacheKeys.animeDetail(id);
    const cached = await this.cacheService.get<AnimeEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getAnime V2 cache hit for ID ${id}`);
      return cached;
    }

    this.logger.debug(`getAnime V2 fetching from db for ID ${id}`);
    const data = await this.animeRepository.find(id);

    if (!data) {
      throw new NotFoundException(`Anime with ID ${id} not found`);
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);
    return data;
  }

  public async refreshAnime(
    id: number,
    force = false,
  ): Promise<AnimeEntity | null> {
    if (isNaN(id)) {
      throw new BadRequestException('ID must be a number');
    }

    const cooldownKey = this.cacheKeys.refreshCooldown(id);

    if (!force) {
      const onCooldown = await this.cacheService.get(cooldownKey);
      if (onCooldown) {
        throw new HttpException(
          'This media was refreshed recently.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Look up existing anime to get AniList ID
    const existing = await this.animeRepository.find(id);
    if (!existing) {
      throw new NotFoundException('Anime not found in database');
    }
    if (!existing.anilistId) {
      throw new BadRequestException('Anime has no AniList ID, cannot refresh');
    }

    if (existing.locked && !force) {
      throw new ConflictException('Anime is locked, cannot refresh');
    }

    // Fetch fresh multi-source data from external APIs
    const fullRecord = await this.animeExternal.fetchFullV2Record(existing.anilistId);
    if (fullRecord) {
      await this.animeRepository.upsertV2Record(fullRecord);
      if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
        for (const rel of fullRecord.relations) {
          if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
            void this.animeQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
            void this.mangaQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          }
        }
      }
    }

    // Invalidate cache
    await this.cacheService.del(this.cacheKeys.animeDetail(id));

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cooldownKey, true, cooldownSeconds);

    return await this.animeRepository.find(id);
  }

  public async ensureAnime(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    let anime = await this.animeRepository.findByAnilistId(anilistId);
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const isStale =
      !anime ||
      !anime.alUpdatedAt ||
      Date.now() - new Date(anime.alUpdatedAt).getTime() >= threeMonthsMs;

    if (isStale) {
      try {
        const fullRecord = await this.animeExternal.fetchFullV2Record(anilistId);
        if (fullRecord) {
          anime = await this.animeRepository.upsertV2Record(fullRecord);
          if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
            for (const rel of fullRecord.relations) {
              if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
              } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
              }
            }
          }
        }
      } catch {
        if (!anime) {
          this.logger.warn(
            `ensureAnime V2: External fetch failed for ${anilistId}, writing minimal stub`,
          );
          anime = await this.animeRepository.upsertV2Record({
            anilistId,
            malId: malId ?? null,
            titlePrimary: title || 'Unknown',
            coverImage: coverImage ?? null,
            startDateYear: 1970,
            seasonYear: 1970,
          });
        }
      }
    }
    return anime;
  }

  public async getSimilarAnime(id: number): Promise<any[]> {
    if (isNaN(id)) {
      return [];
    }
    const cacheKey = this.cacheKeys.animeSimilar(id);
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
