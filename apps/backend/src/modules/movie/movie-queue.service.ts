import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MovieExternal } from './movie.external';
import { MovieRepository } from './movie.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';
import { getTimestampMs } from '../../common/utils/time.utils';

interface ExternalUpsertJob {
  tvdbId: number;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class MovieQueueService implements OnModuleInit {
  private readonly logger = new Logger(MovieQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingTvdbIds = new Set<number>();

  constructor(
    private readonly movieExternal: MovieExternal,
    private readonly movieRepository: MovieRepository,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
  ) {}

  onModuleInit(): void {
    this.processUpsertQueue();
  }

  public async addUpsertJob(
    tvdbId: number,
    options?: { skipRelations?: boolean; force?: boolean },
  ): Promise<void> {
    if (!tvdbId) return;
    if (this.pendingTvdbIds.has(tvdbId)) {
      this.logger.debug(
        `[MovieQueue] Skipping TVDB ID ${tvdbId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.movieRepository.findByTvdbId(tvdbId);
        const updatedMs = getTimestampMs(existing?.tvdbUpdatedAt);
        if (updatedMs !== null) {
          const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
          if (Date.now() - updatedMs < threeMonthsMs) {
            this.logger.debug(
              `[MovieQueue] Skipping TVDB ID ${tvdbId}: updated < 3 months ago (${existing.tvdbUpdatedAt})`,
            );
            return;
          }
        }
      } catch {
        // Ignore lookup check error and proceed with queuing
      }
    }

    this.logger.log(
      `[MovieQueue] Queuing upsert job for TVDB ID ${tvdbId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
    );

    this.pendingTvdbIds.add(tvdbId);
    this.upsertQueue.next({
      tvdbId,
      skipRelations: options?.skipRelations,
      force: options?.force,
    });
  }

  public addSearchUpserts(tvdbIds: number[]): void {
    for (const id of tvdbIds) {
      void this.addUpsertJob(id);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 movie upsert for TVDB ID: ${job.tvdbId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.movieExternal.fetchFullV2Record(job.tvdbId);
            if (fullRecord) {
              await this.movieRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 movie upsert for TVDB ID: ${job.tvdbId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[MovieQueue] Skipping relations processing for TVDB ID ${job.tvdbId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[MovieQueue] Processing ${fullRecord.relations.length} relations for TVDB ID ${job.tvdbId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
                    this.logger.debug(
                      `[MovieQueue] Queuing related MOVIE TVDB ID ${rel.targetTvdbId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetTvdbId);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[MovieQueue] Queuing related ANIME AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[MovieQueue] Queuing related MANGA AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
                  }
                }
              }
            }
          } catch (error: any) {
            this.logger.error(
              `Background V2 movie upsert failed for TVDB ID ${job.tvdbId}: ${error?.message || error}`,
            );
          } finally {
            this.pendingTvdbIds.delete(job.tvdbId);
          }
        }, 1),
        catchError((error) => {
          this.logger.error(`Movie upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
