import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MovieExternal } from './movie.external';
import { MovieRepository } from './movie.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';

interface ExternalUpsertJob {
  tvdbId: number;
  depth?: number;
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

  public async addUpsertJob(tvdbId: number, depth = 0): Promise<void> {
    if (!tvdbId || depth > 5) return;
    if (this.pendingTvdbIds.has(tvdbId)) return;

    try {
      const existing = await this.movieRepository.findByTvdbId(tvdbId);
      if (existing && existing.tvdbUpdatedAt) {
        return;
      }
    } catch {
      // Ignore lookup check error and proceed with queuing
    }

    this.pendingTvdbIds.add(tvdbId);
    this.upsertQueue.next({ tvdbId, depth });
  }

  public addSearchUpserts(tvdbIds: number[]): void {
    for (const id of tvdbIds) {
      void this.addUpsertJob(id, 0);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 movie upsert for TVDB ID: ${job.tvdbId} (depth ${job.depth || 0})`,
            );
            const fullRecord = await this.movieExternal.fetchFullV2Record(job.tvdbId);
            if (fullRecord) {
              await this.movieRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 movie upsert for TVDB ID: ${job.tvdbId}`,
              );

              // Recursively queue all related media for background fetching
              if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
                for (const rel of fullRecord.relations) {
                  if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
                    void this.addUpsertJob(rel.targetTvdbId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
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
        }, 2),
        catchError((error) => {
          this.logger.error(`Movie upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
