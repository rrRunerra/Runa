import { Injectable, Logger } from '@nestjs/common';
import { CharacterRepository } from './character.repository';
import { CharacterDetailEntity } from './character.entities';
import { rrNotFoundException } from 'src/providers/error';
import { CacheService } from '../../providers/cache/cache.service';

@Injectable()
export class CharacterService {
  private readonly logger = new Logger(CharacterService.name);
  private readonly moduleCode = 'ChSve-';

  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly cacheService: CacheService,
  ) {}

  public async getCharacter(id: number): Promise<CharacterDetailEntity> {
    this.logger.debug(`Getting character details for ID: ${id}`);
    const cacheKey = CacheService.keys.characterDetail(id);
    const cached = await this.cacheService.get<CharacterDetailEntity>(cacheKey);
    if (cached) {
      this.logger.debug(`Character details cache hit for ID: ${id}`);
      return cached;
    }

    const data = await this.characterRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}CHF001`, {
        message: 'Character not found',
      });
    }

    await this.cacheService.set(cacheKey, data, 300); // cache for 5 minutes
    return data;
  }

  public async search(query: string): Promise<any[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = CacheService.keys.characterSearch(trimmed);
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Character search cache hit for query: ${trimmed}`);
      return cached;
    }

    const data = await this.characterRepository.search(trimmed);
    await this.cacheService.set(cacheKey, data, 60); // cache for 1 minute
    return data;
  }
}
