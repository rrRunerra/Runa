import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MangaExternal } from './manga.external';
import { MangaRepository } from './manga.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { getTimestampMs } from '../../common/utils/time.utils';

interface ExternalUpsertJob {
  anilistId: number;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class MangaQueueService implements OnModuleInit {
  private readonly logger = new Logger(MangaQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingAnilistIds = new Set<number>();

  constructor(
    private readonly mangaExternal: MangaExternal,
    private readonly mangaRepository: MangaRepository,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
  ) {}

  onModuleInit(): void {
    this.processUpsertQueue();
  }

  public async addUpsertJob(
    anilistId: number,
    options?: { skipRelations?: boolean; force?: boolean },
  ): Promise<void> {
    if (!anilistId) return;
    if (this.pendingAnilistIds.has(anilistId)) {
      this.logger.debug(
        `[MangaQueue] Skipping AniList ID ${anilistId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.mangaRepository.findByAnilistId(anilistId);
        const updatedMs = getTimestampMs(existing?.alUpdatedAt);
        if (updatedMs !== null) {
          const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
          if (Date.now() - updatedMs < threeMonthsMs) {
            this.logger.debug(
              `[MangaQueue] Skipping AniList ID ${anilistId}: updated < 3 months ago (${existing.alUpdatedAt})`,
            );
            return;
          }
        }
      } catch {
        // Ignore lookup check error and proceed with queuing
      }
    }

    this.logger.log(
      `[MangaQueue] Queuing upsert job for AniList ID ${anilistId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
    );

    this.pendingAnilistIds.add(anilistId);
    this.upsertQueue.next({
      anilistId,
      skipRelations: options?.skipRelations,
      force: options?.force,
    });
  }

  public addSearchUpserts(anilistIds: number[]): void {
    for (const id of anilistIds) {
      void this.addUpsertJob(id);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 manga upsert for AniList ID: ${job.anilistId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.mangaExternal.fetchFullV2Record(job.anilistId);
            if (fullRecord) {
              await this.mangaRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 manga upsert for AniList ID: ${job.anilistId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[MangaQueue] Skipping relations processing for AniList ID ${job.anilistId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[MangaQueue] Processing ${fullRecord.relations.length} relations for AniList ID ${job.anilistId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (format: ${rel.format || 'UNKNOWN'}, relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[MangaQueue] Queuing related MANGA AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[MangaQueue] Queuing related ANIME AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
                  }
                }
              }
            }
          } catch (error: any) {
            this.logger.error(
              `Background V2 manga upsert failed for AniList ID ${job.anilistId}: ${error?.message || error}`,
            );
          } finally {
            this.pendingAnilistIds.delete(job.anilistId);
          }
        }, 1),
        catchError((error) => {
          this.logger.error(`Manga upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
