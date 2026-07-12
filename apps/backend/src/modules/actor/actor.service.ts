import { Injectable, Logger } from '@nestjs/common';
import { ActorRepository } from './actor.repository';
import { ActorDetailEntity } from './actor.entities';
import { rrNotFoundException } from 'src/providers/error';
import { CacheService } from '../../providers/cache/cache.service';

@Injectable()
export class ActorService {
  private readonly logger = new Logger(ActorService.name);
  private readonly moduleCode = 'AcSve-';

  constructor(
    private readonly actorRepository: ActorRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async getActor(id: number): Promise<ActorDetailEntity> {
    this.logger.debug(`Getting actor details for ID: ${id}`);
    const cacheKey = CacheService.keys.actorDetail(id);
    const cached = await this.cacheService.get<ActorDetailEntity>(cacheKey);
    if (cached) {
      this.logger.debug(`Actor details cache hit for ID: ${id}`);
      return cached;
    }

    const data = await this.actorRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}ACF001`, {
        message: 'Actor not found',
      });
    }

    await this.cacheService.set(cacheKey, data, 300); // cache for 5 minutes
    return data;
  }

  public async search(query: string): Promise<any[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = CacheService.keys.actorSearch(trimmed);
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Actor search cache hit for query: ${trimmed}`);
      return cached;
    }

    const data = await this.actorRepository.search(trimmed);
    await this.cacheService.set(cacheKey, data, 60); // cache for 1 minute
    return data;
  }
}
