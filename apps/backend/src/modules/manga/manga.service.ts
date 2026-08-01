import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MangaRepository } from './manga.repository';
import { MangaExternal } from './manga.external';
import { MangaQueueService } from './manga-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MangaEntity, MangaSearchEntity } from './manga.entities';
import {
  rrConflictException,
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
} from 'src/providers/error';
import { AnimeQueueService } from '../anime/anime-queue.service';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);
  private readonly moduleCode = 'MaSve-';
  private readonly cacheDuration = Number(
    process.env.MANGA_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly mangaRepository: MangaRepository,
    private readonly mangaQueueService: MangaQueueService,
    private readonly cacheService: CacheService,
    private readonly mangaExternal: MangaExternal,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
  ) {}

  private readonly cacheKeys = {
    mangaDetail: (id: number) => `manga:v2:${id}`,
    mangaSearch: (query: string) => `manga:v2:search:${query}`,
    mangaSimilar: (id: number) => `manga:v2:similar:${id}`,
  };

  public async search(name: string): Promise<MangaSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    const cacheKey = this.cacheKeys.mangaSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: MangaSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`Manga search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: MangaSearchEntity[] = await this.mangaRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying AniList for manga: "${cleanName}"`);
      const externalResults = await this.mangaExternal.search(cleanName);

      if (externalResults.length > 0) {
        result = await Promise.all(
          externalResults.map(async (item) => {
            const dbRecord = await this.mangaRepository.upsertV2Record({
              anilistId: item.anilistId,
              titlePrimary: item.title,
              titleSecondary: item.secondaryTitle,
              coverImage: item.coverImage,
              format: item.format,
              status: item.status,
              startDateYear: 1970,
            });
            void this.mangaQueueService.addUpsertJob(item.anilistId);

            return {
              id: dbRecord.id,
              anilistId: item.anilistId,
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

    this.logger.debug(`Manga found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getManga(id: number): Promise<MangaEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = this.cacheKeys.mangaDetail(id);
    const cached = await this.cacheService.get<MangaEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getManga cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getManga fetching from db for ID ${id}`);
    const data = await this.mangaRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}MNF001`, {
        message: `Manga not found`,
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshManga(
    id: number,
    force = false,
  ): Promise<MangaEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cooldownKey = `cooldown:refresh:manga:v2:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cooldownKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    const existing = await this.mangaRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}MNFID001`, {
        message: 'Manga not found in database',
      });
    }
    if (!existing.anilistId) {
      throw new rrError(`${this.moduleCode}MHNAICR001`, {
        message: 'Manga has no AniList ID, cannot refresh',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Manga is locked, cannot refresh',
      });
    }

    const fullRecord = await this.mangaExternal.fetchFullV2Record(existing.anilistId);
    if (fullRecord) {
      await this.mangaRepository.upsertV2Record(fullRecord);
      if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
        for (const rel of fullRecord.relations) {
          if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
            void this.mangaQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
            void this.animeQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          }
        }
      }
    }

    await this.cacheService.del(this.cacheKeys.mangaDetail(id));

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cooldownKey, true, cooldownSeconds);

    return await this.mangaRepository.find(id);
  }

  public async ensureManga(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    let manga = await this.mangaRepository.findByAnilistId(anilistId);
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const isStale =
      !manga ||
      !manga.alUpdatedAt ||
      Date.now() - new Date(manga.alUpdatedAt).getTime() >= threeMonthsMs;

    if (isStale) {
      try {
        const fullRecord = await this.mangaExternal.fetchFullV2Record(anilistId);
        if (fullRecord) {
          manga = await this.mangaRepository.upsertV2Record(fullRecord);
          if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
            for (const rel of fullRecord.relations) {
              if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
              } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
              }
            }
          }
        }
      } catch {
        if (!manga) {
          this.logger.warn(
            `ensureManga V2: External fetch failed for ${anilistId}, writing minimal stub`,
          );
          manga = await this.mangaRepository.upsertV2Record({
            anilistId,
            malId: malId ?? null,
            titlePrimary: title || 'Unknown',
            coverImage: coverImage ?? null,
            startDateYear: 1970,
          });
        }
      }
    }
    return manga;
  }

  public async getSimilarManga(id: number): Promise<any[]> {
    if (isNaN(id)) {
      return [];
    }
    const cacheKey = this.cacheKeys.mangaSimilar(id);
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    const result = await this.mangaRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }
}
