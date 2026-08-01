import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { AnimeExternal } from './anime.external';
import { AnimeRepository } from './anime.repository';
import { MangaQueueService } from '../manga/manga-queue.service';

interface ExternalUpsertJob {
  anilistId: number;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class AnimeQueueService implements OnModuleInit {
  private readonly logger = new Logger(AnimeQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingAnilistIds = new Set<number>();

  constructor(
    private readonly animeExternal: AnimeExternal,
    private readonly animeRepository: AnimeRepository,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
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
        `[AnimeQueue] Skipping AniList ID ${anilistId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.animeRepository.findByAnilistId(anilistId);
        if (existing && existing.alUpdatedAt) {
          const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
          if (Date.now() - new Date(existing.alUpdatedAt).getTime() < threeMonthsMs) {
            this.logger.debug(
              `[AnimeQueue] Skipping AniList ID ${anilistId}: updated < 3 months ago (${existing.alUpdatedAt})`,
            );
            return;
          }
        }
      } catch {
        // Ignore lookup check error and proceed with queuing
      }
    }

    this.logger.log(
      `[AnimeQueue] Queuing upsert job for AniList ID ${anilistId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
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
              `Processing background V2 anime upsert for AniList ID: ${job.anilistId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.animeExternal.fetchFullV2Record(job.anilistId);
            if (fullRecord) {
              await this.animeRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 anime upsert for AniList ID: ${job.anilistId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[AnimeQueue] Skipping relations processing for AniList ID ${job.anilistId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[AnimeQueue] Processing ${fullRecord.relations.length} relations for AniList ID ${job.anilistId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (format: ${rel.format || 'UNKNOWN'}, relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[AnimeQueue] Queuing related ANIME AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[AnimeQueue] Queuing related MANGA AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
                  }
                }
              }
            }
          } catch (error: any) {
            this.logger.error(
              `Background V2 anime upsert failed for AniList ID ${job.anilistId}: ${error?.message || error}`,
            );
          } finally {
            this.pendingAnilistIds.delete(job.anilistId);
          }
        }, 1),
        catchError((error) => {
          this.logger.error(`Anime upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
