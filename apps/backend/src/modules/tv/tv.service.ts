import { Injectable, Logger } from '@nestjs/common';
import { TvRepository } from './tv.repository';
import { TvQueueService } from './tv-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';
import { TvEntity, TvSearchEntity } from './tv.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { TvExternal } from './tv.external';

interface DbTvResult {
  id: number;
  tvdbId: number;
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  coverImage?: string | null;
}

@Injectable()
export class TvService {
  private readonly logger = new Logger(TvService.name);
  private readonly moduleCode = 'TvSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
  private readonly cacheDuration = Number(
    process.env.TV_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly tvRepository: TvRepository,
    private readonly tvQueueService: TvQueueService,
    private readonly cacheService: CacheService,
    private readonly tvExternal: TvExternal,
  ) {}

  public async search(name: string): Promise<TvSearchEntity[]> {
    const normalized = name.trim().toLowerCase();
    const cacheKey = `tv-search:${normalized.replaceAll(' ', '')}`;

    const cached = await this.cacheService.get<TvSearchEntity[]>(cacheKey);

    if (cached) {
      this.logger.debug(`TV search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: TvSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.tvRepository.search(name);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = (await this.tvExternal.search(name)) ?? [];
      usedExternal = true;
    }

    this.logger.debug(`TV series found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(result),
        this.cacheDuration,
      );
    }

    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug(`Queuing background refresh for TV series`);
      this.tvQueueService.addSearchRefresh(name, cacheKey);
    }

    return result;
  }

  public async getTv(id: number): Promise<TvEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `tv:${id}`;
    const cached = await this.cacheService.get<TvEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getTv cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getTv fetching from db`);
    const data = await this.tvRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}TNF001`, {
        message: 'TV series not found',
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshTv(
    id: number,
    force = false,
  ): Promise<TvEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:tv:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    const existing = await this.tvRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}TNFID001`, {
        message: 'TV series not found in database',
      });
    }
    if (!existing.tvdbId) {
      throw new rrError(`${this.moduleCode}THNTVDB001`, {
        message: 'TV series has no TVDB ID, cannot refresh',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'TV series is locked, cannot refresh',
      });
    }

    await this.tvExternal.fetchAndUpsertTv(
      existing.tvdbId,
      ...(force ? [force] : []),
    );

    await this.cacheService.del(`tv:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.tvRepository.find(id);
  }

  public async ensureTv(
    tvdbId: number,
    title?: string,
    coverImage?: string,
  ): Promise<DbTvResult | null> {
    let tv = (await this.tvRepository.findByTvdbId(
      tvdbId,
    )) as DbTvResult | null;
    if (!tv) {
      try {
        await this.tvExternal.fetchAndUpsertTv(tvdbId);
        tv = (await this.tvRepository.findByTvdbId(
          tvdbId,
        )) as DbTvResult | null;
      } catch {
        const upserted = await this.tvRepository.upsert(tvdbId, {
          tvdbId,
          titleRomaji: title || 'Unknown',
          coverImage: coverImage || null,
        });
        tv = upserted as DbTvResult;
      }
    }
    return tv;
  }
}
