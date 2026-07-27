import { Injectable, Logger } from '@nestjs/common';
import { MovieRepository } from './movie.repository';
import { MovieQueueService } from './movie-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';
import { MovieEntity, MovieSearchEntity } from './movie.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieExternal } from './movie.external';

interface DbMovieResult {
  id: number;
  tvdbId: number;
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  coverImage?: string | null;
}

@Injectable()
export class MovieService {
  private readonly logger = new Logger(MovieService.name);
  private readonly moduleCode = 'MoSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
  private readonly cacheDuration = Number(
    process.env.MOVIE_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly movieQueueService: MovieQueueService,
    private readonly cacheService: CacheService,
    private readonly movieExternal: MovieExternal,
  ) {}

  public async search(name: string): Promise<MovieSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    const cacheKey = CacheService.keys.movieSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: MovieSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached)) {
      this.logger.debug(`Movie search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: MovieSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.movieRepository.search(cleanName);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.movieExternal.search(cleanName);
      usedExternal = true;
    }

    this.logger.debug(`Movies found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug('Queuing background refresh for movies');
      this.movieQueueService.addSearchRefresh(cleanName, cacheKey);
    }

    return result;
  }

  public async getMovie(id: number): Promise<MovieEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `movie:${id}`;
    const cached = await this.cacheService.get<MovieEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getMovie cache hit for ${id}`);
      return cached;
    }

    this.logger.debug('getMovie fetching from db');
    const data = await this.movieRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}MNF001`, {
        message: 'Movie not found',
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshMovie(
    id: number,
    force = false,
  ): Promise<MovieEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:movie:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    // Look up the existing entry to get the TVDB ID
    const existing = await this.movieRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}MNFID001`, {
        message: 'Movie not found in database',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Movie is locked, cannot refresh',
      });
    }

    // Fetch fresh data from TVDB
    await this.movieExternal.fetchAndUpsertMovie(
      existing.tvdbId,
      ...(force ? [force] : []),
    );

    // Bust the cache so next getMovie fetches fresh data
    await this.cacheService.del(`movie:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.movieRepository.find(id);
  }

  public async ensureMovie(
    tvdbId: number,
    title?: string,
    coverImage?: string,
  ): Promise<DbMovieResult | null> {
    let movie = (await this.movieRepository.findByTvdbId(
      tvdbId,
    )) as DbMovieResult | null;
    if (!movie) {
      try {
        await this.movieExternal.fetchAndUpsertMovie(tvdbId);
        movie = (await this.movieRepository.findByTvdbId(
          tvdbId,
        )) as DbMovieResult | null;
      } catch {
        movie = (await this.movieRepository.upsert(tvdbId, {
          tvdbId,
          titleRomaji: title || 'Unknown',
          coverImage: coverImage || null,
        })) as DbMovieResult;
      }
    }
    return movie;
  }

  public async getSimilarMovie(id: number): Promise<any[]> {
    if (isNaN(id)) {
      return [];
    }
    const cacheKey = `movie:similar:${id}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
    const result = await this.movieRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }

  public async getRemoteIds(
    tvdbId: number,
  ): Promise<{ tmdbId?: number; imdbId?: string } | null> {
    return this.movieExternal.getRemoteIds(tvdbId);
  }
}
