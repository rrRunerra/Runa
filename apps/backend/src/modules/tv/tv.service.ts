import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TvRepository } from './tv.repository';
import { TvQueueService } from './tv-queue.service';
import { TvEntity, TvSearchEntity } from './tv.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { TvExternal } from './tv.external';

interface DbTvResult {
  id: number;
  tvDBId: number | null;
  titlePrimary?: string | null;
  titleSecondary?: string | null;
  coverImage?: string | null;
}

@Injectable()
export class TvService {
  private readonly logger = new Logger(TvService.name);
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
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = CacheService.keys.tvSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: TvSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`TV search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: TvSearchEntity[] = await this.tvRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying TVDB for: "${cleanName}"`);
      const externalResults = await this.tvExternal.search(cleanName);

      if (externalResults.length > 0) {
        result = externalResults;
      }
    }

    this.logger.debug(`TV series found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getTv(id: number): Promise<TvEntity | undefined> {
    if (isNaN(id)) {
      throw new BadRequestException('ID must be a number');
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
      throw new NotFoundException('TV series not found');
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshTv(
    id: number,
    force = false,
  ): Promise<TvEntity | undefined | null> {
    if (isNaN(id)) {
      throw new BadRequestException('ID must be a number');
    }

    const cacheKey = `cooldown:refresh:tv:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new HttpException('This media was refreshed recently.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const existing = await this.tvRepository.find(id);
    if (!existing) {
      throw new NotFoundException('TV series not found in database');
    }
    if (!existing.tvDBId) {
      throw new BadRequestException('TV series has no TVDB ID, cannot refresh');
    }

    if (existing.locked && !force) {
      throw new ConflictException('TV series is locked, cannot refresh');
    }

    await this.tvExternal.fetchAndUpsertTv(
      existing.tvDBId,
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
        const upserted = await this.tvRepository.upsertV2Record({
          tvDBId: tvdbId,
          titlePrimary: title || 'Unknown',
          coverImage: coverImage || null,
        });
        tv = upserted as DbTvResult;
      }
    }
    return tv;
  }

  public async getSimilarTv(id: number): Promise<any[]> {
    if (isNaN(id)) {
      return [];
    }
    const cacheKey = `tv:similar:${id}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    const result = await this.tvRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }
}
