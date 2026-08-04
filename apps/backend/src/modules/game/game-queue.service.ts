import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { GameExternal } from './game.external';
import { GameRepository } from './game.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';
import { MovieQueueService } from '../movie/movie-queue.service';
import { BookQueueService } from '../book/book-queue.service';
import { getTimestampMs } from '../../common/utils/time.utils';

interface ExternalUpsertJob {
  igdbId?: number;
  rawgId?: number;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class GameQueueService implements OnModuleInit {
  private readonly logger = new Logger(GameQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingIgdbIds = new Set<number>();

  constructor(
    private readonly gameExternal: GameExternal,
    private readonly gameRepository: GameRepository,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
    @Inject(forwardRef(() => MovieQueueService))
    private readonly movieQueueService: MovieQueueService,
    @Inject(forwardRef(() => BookQueueService))
    private readonly bookQueueService: BookQueueService,
  ) {}

  onModuleInit(): void {
    this.processUpsertQueue();
  }

  public async addUpsertJob(
    igdbId: number,
    options?: { skipRelations?: boolean; force?: boolean },
  ): Promise<void> {
    if (!igdbId) return;
    if (this.pendingIgdbIds.has(igdbId)) {
      this.logger.debug(
        `[GameQueue] Skipping IGDB ID ${igdbId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.gameRepository.findByIgdbId(igdbId);
        const updatedMs = getTimestampMs(existing?.igdbUpdatedAt);
        if (updatedMs !== null) {
          const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
          if (Date.now() - updatedMs < threeMonthsMs) {
            this.logger.debug(
              `[GameQueue] Skipping IGDB ID ${igdbId}: record updated at ${existing.igdbUpdatedAt}`,
            );
            return;
          }
        }
      } catch {
        // Ignore check error
      }
    }

    this.logger.log(
      `[GameQueue] Queuing upsert job for IGDB ID ${igdbId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
    );

    this.pendingIgdbIds.add(igdbId);
    this.upsertQueue.next({
      igdbId,
      skipRelations: options?.skipRelations,
      force: options?.force,
    });
  }

  public addSearchUpserts(igdbIds: number[]): void {
    for (const id of igdbIds) {
      void this.addUpsertJob(id, { skipRelations: true });
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          const targetId = job.igdbId;
          if (!targetId) return;

          try {
            this.logger.log(
              `Processing background V2 game upsert for IGDB ID: ${targetId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.gameExternal.fetchFullV2Record(targetId);
            if (fullRecord) {
              await this.gameRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 game upsert for IGDB ID: ${targetId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[GameQueue] Skipping relations processing for IGDB ID ${targetId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[GameQueue] Processing ${fullRecord.relations.length} relations for IGDB ID ${targetId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'GAME' && rel.targetIgdbId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related GAME IGDB ID ${rel.targetIgdbId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetIgdbId);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related ANIME AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related MANGA AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related MOVIE TVDB ID ${rel.targetTvdbId} ${info}`,
                    );
                    void this.movieQueueService.addUpsertJob(rel.targetTvdbId);
                  } else if (rel.targetType === 'BOOK' && rel.targetGoogleBookId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related BOOK Google Book ID ${rel.targetGoogleBookId} ${info}`,
                    );
                    void this.bookQueueService.addUpsertJob(rel.targetGoogleBookId);
                  }
                }
              }
            }
          } catch (error: any) {
            this.logger.error(
              `Background V2 game upsert failed for IGDB ID ${targetId}: ${error?.message || error}`,
            );
          } finally {
            if (targetId) {
              this.pendingIgdbIds.delete(targetId);
            }
          }
        }, 2),
        catchError((error) => {
          this.logger.error(`Game upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
