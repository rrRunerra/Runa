import { Injectable, Logger } from '@nestjs/common';
import { BookRepository } from './book.repository';
import { BookQueueService } from './book-queue.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';
import { BookEntity, BookSearchEntity } from './book.entities';
import { CacheService } from 'src/providers/cache/cache.service';
import { BookExternal } from './book.external';
import { getTimestampMs } from '../../common/utils/time.utils';

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);
  private readonly moduleCode = 'BkSve-';
  private readonly cacheDuration = Number(
    process.env.BOOK_CACHE_DURATION ?? 60 * 60,
  );

  constructor(
    private readonly bookRepository: BookRepository,
    private readonly bookQueueService: BookQueueService,
    private readonly cacheService: CacheService,
    private readonly bookExternal: BookExternal,
  ) {}

  public async search(name: string): Promise<BookSearchEntity[]> {
    const cleanName = decodeURIComponent(name).replace(/\+/g, ' ').trim();
    if (!cleanName) return [];

    const cacheKey = CacheService.keys.bookSearch(cleanName);

    const rawCached = await this.cacheService.get<any>(cacheKey);
    const cached: BookSearchEntity[] | null =
      typeof rawCached === 'string' ? JSON.parse(rawCached) : rawCached;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      this.logger.debug(`Book search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: BookSearchEntity[] = await this.bookRepository.search(cleanName);

    if (result.length === 0) {
      this.logger.debug(`Local DB search empty, querying Google Books for: "${cleanName}"`);
      const externalResults = await this.bookExternal.search(cleanName);

      if (externalResults.length > 0) {
        const googleBookIds = externalResults
          .map((r) => r.googleBookId)
          .filter((id): id is string => Boolean(id));
        this.bookQueueService.addSearchUpserts(googleBookIds);

        result = externalResults;
      }
    }

    this.logger.debug(`Books found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }

    return result;
  }

  public async getBook(id: number | string): Promise<BookEntity | undefined> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (typeof id === 'number' && isNaN(numericId)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number or string',
      });
    }

    const cacheKey = `book:${id}`;
    const cached = await this.cacheService.get<BookEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getBook cache hit for ${id}`);
      return cached;
    }

    this.logger.debug(`getBook fetching from V2 db for ID: ${id}`);
    const data = await this.bookRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}BNF001`, {
        message: 'Book not found',
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshBook(
    id: number,
    force = false,
  ): Promise<BookEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:book:${id}`;

    if (!force) {
      const onCooldown = await this.cacheService.get(cacheKey);

      if (onCooldown) {
        throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
          message: 'This media was refreshed recently.',
        });
      }
    }

    const existing = await this.bookRepository.find(id);
    if (!existing || !existing.googleBookId) {
      throw new rrNotFoundException(`${this.moduleCode}BNFID001`, {
        message: 'Book not found in database',
      });
    }

    if (existing.locked && !force) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Book is locked, cannot refresh',
      });
    }

    await this.bookExternal.fetchAndUpsertBook(existing.googleBookId, force);

    await this.cacheService.del(`book:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.bookRepository.find(id);
  }

  public async ensureBook(
    googleBookId: string,
    title?: string,
    coverImage?: string,
  ): Promise<BookEntity | null> {
    let book = await this.bookRepository.find(googleBookId);
    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const googleBookUpdatedMs = getTimestampMs(
      (book as any)?.googleBookUpdatedAt ?? (book as any)?.googleBooksUpdatedAt,
    );
    const isStale =
      !book ||
      googleBookUpdatedMs === null ||
      Date.now() - googleBookUpdatedMs >= threeMonthsMs;

    if (isStale) {
      try {
        await this.bookExternal.fetchAndUpsertBook(googleBookId);
        book = await this.bookRepository.find(googleBookId);
      } catch {
        if (!book) {
          this.logger.warn(
            `ensureBook V2: External fetch failed for ${googleBookId}, writing minimal stub`,
          );
          await this.bookRepository.upsertV2Record({
            googleBookId,
            titlePrimary: title || 'Unknown',
            coverImage: coverImage ?? null,
            releaseDateYear: 1970,
          });
          book = await this.bookRepository.find(googleBookId);
        }
      }
    }
    return book;
  }

  public async getSimilarBook(id: number): Promise<BookSearchEntity[]> {
    if (isNaN(id)) return [];
    const cacheKey = `book:similar:${id}`;
    const cached = await this.cacheService.get<BookSearchEntity[]>(cacheKey);
    if (cached && Array.isArray(cached)) return cached;

    const result = await this.bookRepository.findSimilar(id);
    if (result && result.length > 0) {
      await this.cacheService.set(cacheKey, result, this.cacheDuration);
    }
    return result;
  }
}
