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
  depth?: number;
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

  public async addUpsertJob(rawgId: number, depth = 0): Promise<void> {
    if (!rawgId || depth > 5) return;
    if (this.pendingRawgIds.has(rawgId)) return;

    try {
      const existing = await this.gameRepository.findByRawgId(rawgId);
      if (existing && existing.rawgUpdatedAt) {
        return;
      }
    } catch {
      // Ignore check error
    }

    this.pendingRawgIds.add(rawgId);
    this.upsertQueue.next({ rawgId, depth });
  }

  public addSearchUpserts(rawgIds: number[]): void {
    for (const id of rawgIds) {
      void this.addUpsertJob(id, 0);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 game upsert for RAWG ID: ${job.rawgId} (depth ${job.depth || 0})`,
            );
            const fullRecord = await this.gameExternal.fetchFullV2Record(job.rawgId);
            if (fullRecord) {
              await this.gameRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 game upsert for RAWG ID: ${job.rawgId}`,
              );

              if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
                for (const rel of fullRecord.relations) {
                  if (rel.targetType === 'GAME' && rel.targetRawgId) {
                    void this.addUpsertJob(rel.targetRawgId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'MOVIE' && rel.targetTvdbId) {
                    void this.movieQueueService.addUpsertJob(rel.targetTvdbId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'BOOK' && rel.targetGoogleBookId) {
                    void this.bookQueueService.addUpsertJob(rel.targetGoogleBookId, (job.depth || 0) + 1);
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
