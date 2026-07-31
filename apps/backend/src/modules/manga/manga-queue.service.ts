import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MangaExternal } from './manga.external';
import { MangaRepository } from './manga.repository';
import { AnimeQueueService } from '../anime/anime-queue.service';

interface ExternalUpsertJob {
  anilistId: number;
  depth?: number;
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

  public async addUpsertJob(anilistId: number, depth = 0): Promise<void> {
    if (!anilistId || depth > 5) return;
    if (this.pendingAnilistIds.has(anilistId)) return;

    try {
      const existing = await this.mangaRepository.findByAnilistId(anilistId);
      if (existing && existing.alUpdatedAt) {
        const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(existing.alUpdatedAt).getTime() < threeMonthsMs) {
          return;
        }
      }
    } catch {
      // Ignore lookup check error and proceed with queuing
    }

    this.pendingAnilistIds.add(anilistId);
    this.upsertQueue.next({ anilistId, depth });
  }

  public addSearchUpserts(anilistIds: number[]): void {
    for (const id of anilistIds) {
      void this.addUpsertJob(id, 0);
    }
  }

  private processUpsertQueue(): void {
    this.upsertQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(
              `Processing background V2 manga upsert for AniList ID: ${job.anilistId} (depth ${job.depth || 0})`,
            );
            const fullRecord = await this.mangaExternal.fetchFullV2Record(job.anilistId);
            if (fullRecord) {
              await this.mangaRepository.upsertV2Record(fullRecord);
              this.logger.log(
                `Successfully completed background V2 manga upsert for AniList ID: ${job.anilistId}`,
              );

              // Recursively queue all related manga and anime for background metadata fetching
              if (fullRecord.relations && Array.isArray(fullRecord.relations)) {
                for (const rel of fullRecord.relations) {
                  if (rel.targetType === 'MANGA' && rel.targetAnilistId) {
                    void this.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
                  } else if (rel.targetType === 'ANIME' && rel.targetAnilistId) {
                    void this.animeQueueService.addUpsertJob(rel.targetAnilistId, (job.depth || 0) + 1);
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
