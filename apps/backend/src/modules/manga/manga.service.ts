import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);
  private readonly moduleCode = 'MaSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
  private readonly cacheDuration = Number(
    process.env.MANGA_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly mangaRepository: MangaRepository,
    private readonly mangaQueueService: MangaQueueService,
    private readonly cacheService: CacheService,
    private readonly mangaExternal: MangaExternal,
  ) {}

  public async search(name: string): Promise<MangaSearchEntity[]> {
    const normalized = name.trim().toLowerCase();
    const cacheKey = `manga-search:${normalized.replaceAll(' ', '')}`;

    const cached = await this.cacheService.get<MangaSearchEntity[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Manga search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: MangaSearchEntity[] = [];
    let externalUsed = false;

    if (this.useLocalMedia) {
      result = await this.mangaRepository.search(name);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.mangaExternal.search(name);
      externalUsed = true;
    }

    this.logger.debug(`Manga found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(result),
        this.cacheDuration,
      );
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !externalUsed && result.length > 0) {
      this.logger.debug(`Queuing background refresh for manga`);
      this.mangaQueueService.addSearchRefresh(name, cacheKey);
    }

    return result;
  }

  public async getManga(id: number): Promise<MangaEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `manga:${id}`;
    const cached = await this.cacheService.get<MangaEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getManga cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getManga fetching from db`);
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
  ): Promise<MangaEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:manga:${id}`;
    const onCooldown = await this.cacheService.get(cacheKey);

    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message: 'This media was refreshed recently.',
      });
    }

    // Look up the existing entry to get the AniList ID
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

    if (existing.locked) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Manga is locked, cannot refresh',
      });
    }

    // Fetch fresh data from AniList
    await this.mangaExternal.fetchAndUpsertManga(existing.anilistId);

    // Bust the cache so next getManga fetches fresh data
    await this.cacheService.del(`manga:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.mangaRepository.find(id);
  }

  public async ensureManga(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    // Check if already in DB by anilistId
    let manga = await this.mangaRepository.findByAnilistId(anilistId);
    if (!manga) {
      try {
        await this.mangaExternal.fetchAndUpsertManga(anilistId);
        manga = await this.mangaRepository.findByAnilistId(anilistId);
      } catch {
        // AniList fetch failed — write minimal stub so the list entry can be created
        this.logger.warn(
          `ensureManga: AniList fetch failed for ${anilistId}, writing stub`,
        );
        manga = await this.mangaRepository.upsert(anilistId, {
          malId: malId ?? null,
          titleRomaji: title || 'Unknown',
          coverImageLarge: coverImage ?? null,
        });
      }
    }
    return manga;
  }
}
