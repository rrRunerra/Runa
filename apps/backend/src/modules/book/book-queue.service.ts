import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { BookExternal } from './book.external';
import { BookRepository } from './book.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';

interface ExternalUpsertJob {
  googleBookId: string;
  depth?: number;
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

  public async addUpsertJob(googleBookId: string, depth = 0): Promise<void> {
    if (!googleBookId || depth > 5) return;
    if (this.pendingBookIds.has(googleBookId)) return;

    try {
      const existing = await this.bookRepository.findByGoogleBookId(googleBookId);
      if (existing && existing.googleBooksUpdatedAt) {
        return;
      }
    } catch {
      // Ignore check errors
    }

    this.pendingBookIds.add(googleBookId);
    this.upsertQueue.next({ googleBookId, depth });
  }

  public addSearchUpserts(googleBookIds: string[]): void {
    for (const id of googleBookIds) {
      void this.addUpsertJob(id, 0);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 book upsert for Google Book ID: ${job.googleBookId} (depth ${job.depth || 0})`,
            );
            const fullRecord = await this.bookExternal.fetchFullV2Record(job.googleBookId);
            if (fullRecord) {
              await this.bookRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 book upsert for Google Book ID: ${job.googleBookId}`,
              );

              if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
                for (const rel of fullRecord.relations) {
                  if (rel.targetType === 'BOOK' && rel.targetGoogleBookId) {
                    void this.addUpsertJob(rel.targetGoogleBookId, (job.depth || 0) + 1);
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
