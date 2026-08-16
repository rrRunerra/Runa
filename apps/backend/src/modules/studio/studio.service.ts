import { Injectable, Logger } from '@nestjs/common';
import { StudioRepository } from './studio.repository';
import { StudioDetailEntity, StudioSearchEntity } from './studio.entities';
import { rrNotFoundException } from 'src/providers/error';
import { CacheService } from '../../providers/cache/cache.service';

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);
  private readonly moduleCode = 'StSve-';

  constructor(
    private readonly studioRepository: StudioRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async getStudio(id: number): Promise<StudioDetailEntity> {
    this.logger.debug(`Getting studio details for ID: ${id}`);
    const cacheKey = CacheService.keys.studioDetail(id);
    const cached = await this.cacheService.get<StudioDetailEntity>(cacheKey);
    if (cached) {
      this.logger.debug(`Studio details cache hit for ID: ${id}`);
      return cached;
    }

    const data = await this.studioRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}SNF001`, {
        message: 'Studio not found',
      });
    }

    await this.cacheService.set(cacheKey, data, 300); // cache for 5 minutes
    return data;
  }

  public async search(query: string): Promise<StudioSearchEntity[]> {
    const cleanName = decodeURIComponent(query).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = CacheService.keys.studioSearch(cleanName);
    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: StudioSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached)) {
      this.logger.debug(`Studio search cache hit for query: ${cleanName}`);
      return cached;
    }

    const data = await this.studioRepository.search(cleanName);
    await this.cacheService.set(cacheKey, data, 60); // cache for 1 minute
    return data;
  }
}
