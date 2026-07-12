import { Injectable, Logger } from '@nestjs/common';
import { DiscoverRepository } from './discover.repository';
import { AnimeFormat, MangaFormat } from '@runa/database';
import { DiscoverResponse, DiscoverMetaResponse, CalendarItemEntity } from './discover.entity';
import { DiscoverQueryDto, CalendarQueryDto } from './discover.dto';
import { CacheService } from '../../providers/cache/cache.service';
import { rrError } from 'src/providers/error';

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);
  private readonly moduleCode = 'DrSve-';

  constructor(
    private readonly discoverRepository: DiscoverRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async discover(
    type: string,
    query: DiscoverQueryDto,
  ): Promise<DiscoverResponse> {
    const mappedType = this.mapType(type);
    const limit = query.limit ?? 30;
    const page = query.page ?? 1;
    const year = query.year ?? '';
    const format = query.format ?? '';
    const status = query.status ?? '';
    const search = query.search ?? '';
    const sort = query.sort ?? '';
    const addedWithin = query.addedWithin ?? '';

    const cacheKey = CacheService.keys.discoverList(
      mappedType,
      page,
      limit,
      year,
      format,
      status,
      search,
      sort,
      addedWithin,
    );
    const cached = await this.cacheService.get<DiscoverResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Discover cache hit for key: ${cacheKey}`);
      return cached;
    }

    const { items, totalCount } = await this.discoverRepository.discover(
      mappedType,
      query,
    );

    const hasMore = totalCount > Number(page) * Number(limit);

    const response: DiscoverResponse = {
      items,
      metadata: {
        totalCount,
        page: Number(page),
        limit: Number(limit),
        hasMore,
      },
    };

    await this.cacheService.set(cacheKey, response, 60);

    return response;
  }

  public async getMetadata(type: string): Promise<DiscoverMetaResponse> {
    const mappedType = this.mapType(type);

    const cacheKey = CacheService.keys.discoverMeta(mappedType);
    const cached = await this.cacheService.get<DiscoverMetaResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Discover metadata cache hit for type: ${mappedType}`);
      return cached;
    }

    const [years, statuses] = await Promise.all([
      this.discoverRepository.getYears(mappedType),
      this.discoverRepository.getStatuses(mappedType),
    ]);

    let formats: string[] = [];
    if (mappedType === 'anime') {
      formats = Object.values(AnimeFormat);
    } else if (mappedType === 'manga') {
      formats = Object.values(MangaFormat);
    }

    const response: DiscoverMetaResponse = {
      years,
      formats,
      statuses,
    };

    await this.cacheService.set(cacheKey, response, 3600);

    return response;
  }

  public async getCalendar(
    query: CalendarQueryDto,
    username?: string,
  ): Promise<CalendarItemEntity[]> {
    const start = new Date(query.start + 'T00:00:00Z');
    const end = new Date(query.end + 'T23:59:59Z');
    const isWatchlist = query.watchlist === 'true';

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new rrError(`${this.moduleCode}INVLD001`, {
        message: 'Invalid start or end date format',
      });
    }

    return this.discoverRepository.getCalendar(
      start,
      end,
      isWatchlist ? username : undefined,
    );
  }

  private mapType(type: string): string {
    const typeLower = type.toLowerCase();
    if (typeLower === 'movies') return 'movie';
    if (typeLower === 'games') return 'game';
    if (typeLower === 'books') return 'book';
    return typeLower;
  }
}

