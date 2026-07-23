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

interface DbGameResult {
  id: number;
  rawgId: number;
  titleString?: string | null;
  titleNative?: string | null;
  coverImage?: string | null;
}

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly moduleCode = 'GeSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
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
    const cacheKey = CacheService.keys.gameSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: GameSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached)) {
      this.logger.debug(`Game search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: GameSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.gameRepository.search(cleanName);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.gameExternal.search(cleanName);
      usedExternal = true;
    }

    this.logger.debug(`Games found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug('Queuing background refresh for games');
      this.gameQueueService.addSearchRefresh(cleanName, cacheKey);
    }

    return result;
  }

  public async getGame(id: number): Promise<GameEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `game:${id}`;
    const cached = await this.cacheService.get<GameEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getGame cache hit for ${id}`);
      return cached;
    }

    this.logger.debug('getGame fetching from db');
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

    // Look up the existing entry to get the RAWG ID
    const existing = await this.gameRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}GNFID001`, {
        message: 'Game not found in database',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Game is locked, cannot refresh',
      });
    }

    // Fetch fresh data from RAWG
    await this.gameExternal.fetchAndUpsertGame(
      existing.rawgId,
      ...(force ? [force] : []),
    );

    // Bust the cache so next getGame fetches fresh data
    await this.cacheService.del(`game:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return this.gameRepository.find(id);
  }

  public async ensureGame(
    rawgId: number,
    title?: string,
    coverImage?: string,
  ): Promise<{ id: number } | null> {
    let game = (await this.gameRepository.findByRawgId(
      rawgId,
    )) as DbGameResult | null;
    if (!game) {
      try {
        await this.gameExternal.fetchAndUpsertGame(rawgId);
        game = await this.gameRepository.findByRawgId(rawgId);
      } catch {
        game = (await this.gameRepository.upsert(rawgId, {
          rawgId,
          titleString: title || 'Unknown',
          coverImage: coverImage || null,
        })) as DbGameResult;
      }
    }
    return game ? { id: game.id } : null;
  }
}
