import { Injectable, Logger } from '@nestjs/common';
import { MangaRepository } from './manga.repository';
import { MangaExternal } from './manga.external';
import { MangaQueueService } from './manga-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MangaEntity, MangaSearchEntity } from './manga.entities';
import { rrError } from 'src/providers/error';

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

  public async getManga(id: number): Promise<MangaEntity | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    return await this.mangaRepository.find(id);
  }

  public async ensureManga(
    anilistId: number,
    malId?: number | null,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    let manga = await this.mangaRepository.findByAnilistId(anilistId);
    if (!manga) {
      manga = await this.mangaRepository.upsert(anilistId, {
        anilistId,
        malId: malId || null,
        titleRomaji: title || 'Unknown',
        coverImageLarge: coverImage || '',
      });
    } else if (malId && !manga.malId) {
      manga = await this.mangaRepository.upsert(anilistId, {
        malId,
      });
    }
    return manga;
  }
}
