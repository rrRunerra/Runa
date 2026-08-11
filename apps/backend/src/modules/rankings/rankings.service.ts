import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../providers/cache/cache.service';
import { rrBadRequestException } from 'src/providers/error';
import { RankingsQueryDto } from './rankings.dto';
import {
  RankingsMetaResponse,
  RankingsResponse,
} from './rankings.entities';
import { RankingsRepository } from './rankings.repository';
import { RankingMediaType } from './rankings.types';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);
  private readonly moduleCode = 'RaSve-';

  constructor(
    private readonly rankingsRepository: RankingsRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async getRankings(
    rawType: string,
    query: RankingsQueryDto,
  ): Promise<RankingsResponse> {
    const type = this.normalizeType(rawType);
    const source = query.source || 'aquila';
    const genres = query.genres || 'all';
    const year = query.year ?? 'all';
    const season = query.season || 'all';
    const format = query.format || 'all';
    const status = query.status || 'all';
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 100)));
    const page = Math.max(1, Number(query.page ?? 1));

    const cacheKey = CacheService.keys.rankingsList(
      type,
      source,
      genres,
      year,
      season,
      format,
      status,
      limit,
      page,
    );

    const cached = await this.cacheService.get<RankingsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Rankings cache hit for: ${cacheKey}`);
      return cached;
    }

    const { items, totalCount } = await this.rankingsRepository.getRankings(
      type,
      query,
    );

    const hasMore = totalCount > page * limit;

    const response: RankingsResponse = {
      items,
      metadata: {
        totalCount,
        limit,
        page,
        source,
        hasMore,
      },
    };

    // Cache ranking list for 10 minutes
    await this.cacheService.set(cacheKey, response, 600);

    return response;
  }

  public async getMetadata(rawType: string): Promise<RankingsMetaResponse> {
    const type = this.normalizeType(rawType);
    const cacheKey = CacheService.keys.rankingsMeta(type);

    const cached = await this.cacheService.get<RankingsMetaResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Rankings metadata cache hit for: ${cacheKey}`);
      return cached;
    }

    const metadata = await this.rankingsRepository.getMetadata(type);

    // Cache metadata for 1 hour
    await this.cacheService.set(cacheKey, metadata, 3600);

    return metadata;
  }

  private normalizeType(type: string): RankingMediaType {
    const lower = (type || '').toLowerCase().trim();
    if (lower === 'movies') return 'movie';
    if (lower === 'games') return 'game';
    if (lower === 'books') return 'book';
    if (
      lower === 'anime' ||
      lower === 'manga' ||
      lower === 'movie' ||
      lower === 'tv' ||
      lower === 'game' ||
      lower === 'book'
    ) {
      return lower as RankingMediaType;
    }
    throw new rrBadRequestException(`${this.moduleCode}IMT001`, {
      message: `Invalid media type for rankings: ${type}. Expected anime, manga, movie, tv, game, or book.`,
    });
  }
}
