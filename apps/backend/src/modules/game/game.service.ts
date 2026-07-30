import { Injectable, Logger } from '@nestjs/common';
import { GameRepository } from './game.repository';
import { GameQueueService } from './game-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';
import { GameEntity, GameSearchEntity } from './game.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { GameExternal } from './game.external';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly moduleCode = 'GeSve-';
  private readonly cacheDuration = Number(
    process.env.GAME_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly gameRepository: GameRepository,
    private readonly gameQueueService: GameQueueService,
    private readonly cacheService: CacheService,
    private readonly gameExternal: GameExternal,
  ) {}

  public async search(name: string): Promise<GameSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = CacheService.keys.gameSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: GameSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`Game search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: GameSearchEntity[] = await this.gameRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying RAWG for game: "${cleanName}"`);
      const externalResults = await this.gameExternal.search(cleanName);

      if (externalResults.length > 0) {
        const rawgIds = externalResults
          .map((r) => r.rawgId)
          .filter((id): id is number => Boolean(id));
        this.gameQueueService.addSearchUpserts(rawgIds);

        result = externalResults;
      }
    }

    this.logger.debug(`Games found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getGame(id: number | string): Promise<GameEntity | undefined> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (typeof id === 'number' && isNaN(numericId)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number or string',
      });
    }

    const cacheKey = `game:${id}`;
    const cached = await this.cacheService.get<GameEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getGame cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getGame fetching from V2 db for ID: ${id}`);
    const data = await this.gameRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}GNF001`, {
        message: 'Game not found',
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshGame(
    id: number,
    force = false,
  ): Promise<GameEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:game:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    const existing = await this.gameRepository.find(id);
    if (!existing || !existing.rawgId) {
      throw new rrNotFoundException(`${this.moduleCode}GNFID001`, {
        message: 'Game not found in database',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Game is locked, cannot refresh',
      });
    }

    await this.gameExternal.fetchAndUpsertGame(existing.rawgId, force);

    await this.cacheService.del(`game:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return this.gameRepository.find(id);
  }

  public async ensureGame(
    rawgId: number,
    title?: string,
    coverImage?: string,
  ): Promise<GameEntity | null> {
    let game = await this.gameRepository.find(rawgId);
    if (!game) {
      try {
        await this.gameExternal.fetchAndUpsertGame(rawgId);
        game = await this.gameRepository.find(rawgId);
      } catch {
        this.logger.warn(
          `ensureGame V2: External fetch failed for ${rawgId}, writing minimal stub`,
        );
        await this.gameRepository.upsertV2Record({
          rawgId,
          titlePrimary: title || 'Unknown',
          coverImage: coverImage ?? null,
          releaseDateYear: 1970,
        });
        game = await this.gameRepository.find(rawgId);
      }
    }
    return game;
  }

  public async getSimilarGame(id: number): Promise<GameSearchEntity[]> {
    if (isNaN(id)) return [];
    const cacheKey = `game:similar:${id}`;
    const cached = await this.cacheService.get<GameSearchEntity[]>(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    const result = await this.gameRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }
}
