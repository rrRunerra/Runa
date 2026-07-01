import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { AnimeExternal } from './anime.external';
import { CacheService } from 'src/providers/cache/cache.service';

interface SearchRefreshJob {
  query: string;
  cacheKey: string;
}

@Injectable()
export class AnimeQueueService implements OnModuleInit {
  private readonly logger = new Logger(AnimeQueueService.name);
  private readonly moduleCode = 'AeQeSve-';
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();
  private readonly searchQueue = new Subject<SearchRefreshJob>();
  private readonly pendingSearches = new Set<string>();

  constructor(
    private readonly animeExternal: AnimeExternal,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit(): void {
    this.processSearchQueue();
  }

  addJob(anilistId: number): void {
    if (!this.processing.has(anilistId)) {
      this.jobQueue.next(anilistId);
    }
  }

  addSearchRefresh(query: string, cacheKey: string): void {
    if (!this.pendingSearches.has(query)) {
      this.pendingSearches.add(query);
      this.searchQueue.next({ query, cacheKey });
    }
  }

  private processSearchQueue(): void {
    this.searchQueue
      .pipe(
        mergeMap(async (job) => {
          try {
            this.logger.log(`Processing search refresh: "${job.query}"`);
            const fresh = await this.animeExternal.search(job.query);
            if (fresh.length > 0) {
              await this.cacheService.set(
                job.cacheKey,
                JSON.stringify(fresh),
                60 * 60,
              );
            }
            this.logger.log(`Completed search refresh: "${job.query}"`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              `Search refresh failed for "${job.query}": ${message}`,
            );
          } finally {
            this.pendingSearches.delete(job.query);
          }
        }, 1),
        catchError((error) => {
          this.logger.error(`Search queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
