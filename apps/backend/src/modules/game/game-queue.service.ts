import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { GameExternal } from './game.external';
import { GameRepository } from './game.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';
import { MovieQueueService } from '../movie/movie-queue.service';
import { BookQueueService } from '../book/book-queue.service';

interface ExternalUpsertJob {
  rawgId: number;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class GameQueueService implements OnModuleInit {
  private readonly logger = new Logger(GameQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingRawgIds = new Set<number>();

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
    rawgId: number,
    options?: { skipRelations?: boolean; force?: boolean },
  ): Promise<void> {
    if (!rawgId) return;
    if (this.pendingRawgIds.has(rawgId)) {
      this.logger.debug(
        `[GameQueue] Skipping RAWG ID ${rawgId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.gameRepository.findByRawgId(rawgId);
        if (existing && existing.rawgUpdatedAt) {
          this.logger.debug(
            `[GameQueue] Skipping RAWG ID ${rawgId}: record updated at ${existing.rawgUpdatedAt}`,
          );
          return;
        }
      } catch {
        // Ignore check error
      }
    }

    this.logger.log(
      `[GameQueue] Queuing upsert job for RAWG ID ${rawgId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
    );

    this.pendingRawgIds.add(rawgId);
    this.upsertQueue.next({
      rawgId,
      skipRelations: options?.skipRelations,
      force: options?.force,
    });
  }

  public addSearchUpserts(rawgIds: number[]): void {
    for (const id of rawgIds) {
      void this.addUpsertJob(id);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 game upsert for RAWG ID: ${job.rawgId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.gameExternal.fetchFullV2Record(job.rawgId);
            if (fullRecord) {
              await this.gameRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 game upsert for RAWG ID: ${job.rawgId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[GameQueue] Skipping relations processing for RAWG ID ${job.rawgId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[GameQueue] Processing ${fullRecord.relations.length} relations for RAWG ID ${job.rawgId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'GAME' && rel.targetRawgId) {
                    this.logger.debug(
                      `[GameQueue] Queuing related GAME RAWG ID ${rel.targetRawgId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetRawgId);
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
              `Background V2 game upsert failed for RAWG ID ${job.rawgId}: ${error?.message || error}`,
            );
          } finally {
            this.pendingRawgIds.delete(job.rawgId);
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
