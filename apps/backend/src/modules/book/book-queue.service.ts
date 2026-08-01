import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { BookExternal } from './book.external';
import { BookRepository } from './book.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';

interface ExternalUpsertJob {
  googleBookId: string;
  skipRelations?: boolean;
  force?: boolean;
}

@Injectable()
export class BookQueueService implements OnModuleInit {
  private readonly logger = new Logger(BookQueueService.name);
  private readonly upsertQueue = new Subject<ExternalUpsertJob>();
  private readonly pendingBookIds = new Set<string>();

  constructor(
    private readonly bookExternal: BookExternal,
    private readonly bookRepository: BookRepository,
    @Inject(forwardRef(() => AnimeQueueService))
    private readonly animeQueueService: AnimeQueueService,
    @Inject(forwardRef(() => MangaQueueService))
    private readonly mangaQueueService: MangaQueueService,
  ) {}

  onModuleInit(): void {
    this.processUpsertQueue();
  }

  public async addUpsertJob(
    googleBookId: string,
    options?: { skipRelations?: boolean; force?: boolean },
  ): Promise<void> {
    if (!googleBookId) return;
    if (this.pendingBookIds.has(googleBookId)) {
      this.logger.debug(
        `[BookQueue] Skipping Google Book ID ${googleBookId}: job already pending in queue`,
      );
      return;
    }

    if (!options?.force) {
      try {
        const existing = await this.bookRepository.findByGoogleBookId(googleBookId);
        if (existing && existing.googleBooksUpdatedAt) {
          this.logger.debug(
            `[BookQueue] Skipping Google Book ID ${googleBookId}: record updated at ${existing.googleBooksUpdatedAt}`,
          );
          return;
        }
      } catch {
        // Ignore check errors
      }
    }

    this.logger.log(
      `[BookQueue] Queuing upsert job for Google Book ID ${googleBookId} (force: ${!!options?.force}, skipRelations: ${!!options?.skipRelations})`,
    );

    this.pendingBookIds.add(googleBookId);
    this.upsertQueue.next({
      googleBookId,
      skipRelations: options?.skipRelations,
      force: options?.force,
    });
  }

  public addSearchUpserts(googleBookIds: string[]): void {
    for (const id of googleBookIds) {
      void this.addUpsertJob(id);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 book upsert for Google Book ID: ${job.googleBookId} (force: ${!!job.force}, skipRelations: ${!!job.skipRelations})`,
            );
            const fullRecord = await this.bookExternal.fetchFullV2Record(job.googleBookId);
            if (fullRecord) {
              await this.bookRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 book upsert for Google Book ID: ${job.googleBookId}`,
              );

              if (job.skipRelations) {
                this.logger.debug(
                  `[BookQueue] Skipping relations processing for Google Book ID ${job.googleBookId} (skipRelations flag set)`,
                );
              } else if (
                fullRecord.relations &&
                Array.isArray(fullRecord.relations)
              ) {
                this.logger.debug(
                  `[BookQueue] Processing ${fullRecord.relations.length} relations for Google Book ID ${job.googleBookId}`,
                );
                for (const rel of fullRecord.relations) {
                  const info = `"${rel.titlePrimary || 'Unknown'}" (relation: ${rel.type || 'UNKNOWN'})`;
                  if (rel.targetType === 'BOOK' && rel.targetGoogleBookId) {
                    this.logger.debug(
                      `[BookQueue] Queuing related BOOK Google Book ID ${rel.targetGoogleBookId} ${info}`,
                    );
                    void this.addUpsertJob(rel.targetGoogleBookId);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[BookQueue] Queuing related ANIME AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId);
                  } else if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    this.logger.debug(
                      `[BookQueue] Queuing related MANGA AniList ID ${rel.targetAnilistId} ${info}`,
                    );
                    void this.mangaQueueService.addUpsertJob(rel.targetAnilistId);
                  }
                }
              }
            }
          } catch (error: any) {
            this.logger.error(
              `Background V2 book upsert failed for Google Book ID ${job.googleBookId}: ${error?.message || error}`,
            );
          } finally {
            this.pendingBookIds.delete(job.googleBookId);
          }
        }, 2),
        catchError((error) => {
          this.logger.error(`Book upsert queue unexpected error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
