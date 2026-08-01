import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { MovieRepository } from './movie.repository';
import { MovieExternal } from './movie.external';
import { MovieQueueService } from './movie-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieEntity, MovieSearchEntity } from './movie.entities';
import {
  rrConflictException,
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
} from 'src/providers/error';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';

@Injectable()
export class MovieService {
  private readonly logger = new Logger(MovieService.name);
  private readonly moduleCode = 'MoSve-';
  private readonly cacheDuration = Number(
    process.env.MOVIE_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly movieRepository: MovieRepository,
    private readonly movieQueueService: MovieQueueService,
    private readonly cacheService: CacheService,
    private readonly movieExternal: MovieExternal,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
  ) {}

  private readonly cacheKeys = {
    movieDetail: (id: number) => `movie:v2:${id}`,
    movieSearch: (query: string) => `movie:v2:search:${query.toLowerCase().trim()}`,
    movieSimilar: (id: number) => `movie:v2:similar:${id}`,
  };

  public async search(name: string): Promise<MovieSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = this.cacheKeys.movieSearch(cleanName);
    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: MovieSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`Movie search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: MovieSearchEntity[] = await this.movieRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying TVDB for movie: "${cleanName}"`);
      const externalResults = await this.movieExternal.search(cleanName);

      if (externalResults.length > 0) {
        const tvdbIds = externalResults
          .map((r) => r.tvdbId)
          .filter((id): id is number => Boolean(id));
        this.movieQueueService.addSearchUpserts(tvdbIds);

        result = externalResults;
      }
    }

    this.logger.debug(`Movies found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getMovie(id: number): Promise<MovieEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = this.cacheKeys.movieDetail(id);
    const cached = await this.cacheService.get<MovieEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getMovie cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getMovie fetching from db for ID ${id}`);
    const data = await this.movieRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}MNF001`, {
        message: `Movie not found`,
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

    const cooldownKey = `cooldown:refresh:movie:v2:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cooldownKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    const existing = await this.movieRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}MNFID001`, {
        message: 'Movie not found in database',
      });
    }

    const tvdbId = existing.tvDBId;
    if (!tvdbId) {
      throw new rrError(`${this.moduleCode}MHNTICR001`, {
        message: 'Movie has no TVDB ID, cannot refresh',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Movie is locked, cannot refresh',
      });
    }

    const fullRecord = await this.movieExternal.fetchFullV2Record(tvdbId);
    if (fullRecord) {
      await this.movieRepository.upsertV2Record(fullRecord);
      if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
        for (const rel of fullRecord.relations) {
          if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
            void this.movieQueueService.addUpsertJob(
              rel.targetTvdbId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
            void this.animeQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
            void this.mangaQueueService.addUpsertJob(
              rel.targetAnilistId,
              { skipRelations: true, ...(force ? { force: true } : {}) },
            );
          }
        }
      }
    }

    await this.cacheService.del(this.cacheKeys.movieDetail(id));

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cooldownKey, true, cooldownSeconds);

    return await this.movieRepository.find(id);
  }

  public async ensureMovie(
    tvdbId: number,
    title?: string,
    coverImage?: string,
  ): Promise<any> {
    let movie = await this.movieRepository.findByTvdbId(tvdbId);
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const isStale =
      !movie ||
      !movie.tvdbUpdatedAt ||
      Date.now() - new Date(movie.tvdbUpdatedAt).getTime() >= threeMonthsMs;

    if (isStale) {
      try {
        const fullRecord = await this.movieExternal.fetchFullV2Record(tvdbId);
        if (fullRecord) {
          movie = await this.movieRepository.upsertV2Record(fullRecord);
          if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
            for (const rel of fullRecord.relations) {
              if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
                void this.movieQueueService.addUpsertJob(rel.targetTvdbId);
              } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
              } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
              }
            }
          }
        }
      } catch {
        if (!movie) {
          this.logger.warn(
            `ensureMovie V2: External fetch failed for ${tvdbId}, writing minimal stub`,
          );
          movie = await this.movieRepository.upsertV2Record({
            tvDBId: tvdbId,
            titlePrimary: title || 'Unknown',
            coverImage: coverImage ?? null,
            releaseDateYear: 1970,
          });
        }
      }
    }
    return movie;
  }

  public async getSimilarMovies(id: number): Promise<MovieSearchEntity[]> {
    if (isNaN(id)) return [];
    const cacheKey = this.cacheKeys.movieSimilar(id);
    const cached = await this.cacheService.get<MovieSearchEntity[]>(cacheKey);
    if (cached) return cached;

    const similar = await this.movieRepository.findSimilar(id);
    if (similar && similar.length > 0) {
      await this.cacheService.set(cacheKey, similar, this.cacheDuration);
    }
    return similar;
  }
}
