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
import { getTimestampMs } from '../../common/utils/time.utils';

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
      void this.triggerBackgroundSearchRefresh(cleanName);
      return cached;
    }

    let result: GameSearchEntity[] = await this.gameRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying IGDB for game: "${cleanName}"`);
      const externalResults = await this.gameExternal.search(cleanName);

      if (externalResults.length > 0) {
        result = externalResults;
      }
    } else {
      void this.triggerBackgroundSearchRefresh(cleanName);
    }

    this.logger.debug(`Games found: ${result.length}`);

    if (result.length > 0) {
      const igdbIds = result
        .map((r) => r.igdbId)
        .filter((id): id is number => Boolean(id));

      if (igdbIds.length > 0) {
        this.gameQueueService.addSearchUpserts(igdbIds);
      }

      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  private async triggerBackgroundSearchRefresh(cleanName: string): Promise<void> {
    const cooldownKey = CacheService.keys.searchRefreshCooldown('game', cleanName);
    const inCooldown = await this.cacheService.get<boolean>(cooldownKey);
    if (inCooldown) {
      this.logger.debug(`Game search background refresh skipped (cooldown active for "${cleanName}")`);
      return;
    }

    await this.cacheService.set(cooldownKey, true, 3600);

    this.logger.debug(`Game search queueing background refresh for: "${cleanName}"`);
    try {
      const externalResults = await this.gameExternal.search(cleanName);
      if (externalResults.length > 0) {
        const igdbIds = externalResults
          .map((r) => r.igdbId)
          .filter((id): id is number => Boolean(id));
        if (igdbIds.length > 0) {
          this.gameQueueService.addSearchUpserts(igdbIds);
        }

        const updated = await this.gameRepository.search(cleanName);
        const finalResults = updated.length > 0 ? updated : externalResults;
        const cacheKey = CacheService.keys.gameSearch(cleanName);
        await this.cacheService.set(cacheKey, finalResults, this.cacheDuration);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Game background search refresh failed for "${cleanName}": ${msg}`);
    }
  }

  public async getGame(id: number | string): Promise<GameEntity | undefined> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (isNaN(numericId)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number or numeric string',
      });
    }

    const cacheKey = `game:${id}`;
    const cached = await this.cacheService.get<GameEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getGame cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getGame fetching from V2 db for ID: ${id}`);
    let data = await this.gameRepository.find(numericId);

    if (!data) {
      const recordByIgdb = await this.gameRepository.findByIgdbId(numericId);
      if (recordByIgdb?.id) {
        data = await this.gameRepository.find(recordByIgdb.id);
      }
    }

    if (!data) {
      try {
        data = (await this.ensureGame(numericId)) || null;
      } catch (err: unknown) {
        data = null;
      }
    }

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
    const extId = existing?.igdbId || existing?.rawgId;
    if (!existing || !extId) {
      throw new rrNotFoundException(`${this.moduleCode}GNFID001`, {
        message: 'Game not found in database',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Game is locked, cannot refresh',
      });
    }

    await this.gameExternal.fetchAndUpsertGame(extId, force);

    await this.cacheService.del(`game:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return this.gameRepository.find(id);
  }

  public async ensureGame(
    igdbId: number,
    title?: string,
    coverImage?: string,
  ): Promise<GameEntity | null> {
    let existingRecord = await this.gameRepository.findByIgdbId(igdbId);
    let game = existingRecord ? await this.gameRepository.find(existingRecord.id) : null;
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const igdbUpdatedMs = getTimestampMs(existingRecord?.igdbUpdatedAt);
    const isStale =
      !game ||
      igdbUpdatedMs === null ||
      Date.now() - igdbUpdatedMs >= threeMonthsMs;

    if (isStale) {
      try {
        await this.gameExternal.fetchAndUpsertGame(igdbId);
        existingRecord = await this.gameRepository.findByIgdbId(igdbId);
        game = existingRecord ? await this.gameRepository.find(existingRecord.id) : null;
      } catch {
        if (!game) {
          this.logger.warn(
            `ensureGame V2: External fetch failed for IGDB ID ${igdbId}, writing minimal stub`,
          );
          const stub = await this.gameRepository.upsertV2Record({
            igdbId,
            titlePrimary: title || 'Unknown',
            coverImage: coverImage ?? null,
            releaseDateYear: 1970,
          });
          game = await this.gameRepository.find(stub.id);
        }
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
