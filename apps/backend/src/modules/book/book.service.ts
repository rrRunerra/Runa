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

interface DbBookResult {
  id: number;
  googleBookId: string;
  titleString?: string | null;
  coverImage?: string | null;
}

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);
  private readonly moduleCode = 'BkSve-';
  private readonly useLocalMedia = process.env.USE_LOCAL_MEDIA_ONLY ?? false;
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
    const normalized = name.trim().toLowerCase();
    const cacheKey = `book-search:${normalized.replaceAll(' ', '')}`;

    const cached = await this.cacheService.get<BookSearchEntity[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Book search cache hit ${cached.length} entries`);
      return cached;
    }

    let result: BookSearchEntity[] = [];
    let usedExternal = false;

    if (this.useLocalMedia) {
      result = await this.bookRepository.search(name);
    }

    if (!this.useLocalMedia || result.length === 0) {
      result = await this.bookExternal.search(name);
      usedExternal = true;
    }

    this.logger.debug(`Books found: ${result.length}`);

    if (result.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(result),
        this.cacheDuration,
      );
    }

    // Queue a background refresh only when local results were returned
    if (this.useLocalMedia && !usedExternal && result.length > 0) {
      this.logger.debug('Queuing background refresh for books');
      this.bookQueueService.addSearchRefresh(name, cacheKey);
    }

    return result;
  }

  public async getBook(id: number): Promise<BookEntity | undefined> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN001`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `book:${id}`;
    const cached = await this.cacheService.get<BookEntity>(cacheKey);

    if (cached) {
      this.logger.debug(`getBook cache hit for ${id}`);
      return cached;
    }

    this.logger.debug('getBook fetching from db');
    const data = await this.bookRepository.find(id);

    if (!data) {
      throw new rrNotFoundException(`${this.moduleCode}BNF001`, {
        message: 'Book not found',
      });
    }

    await this.cacheService.set(cacheKey, data, this.cacheDuration);

    return data;
  }

  public async refreshBook(id: number): Promise<BookEntity | undefined | null> {
    if (isNaN(id)) {
      throw new rrError(`${this.moduleCode}IMBAN002`, {
        message: 'ID must be a number',
      });
    }

    const cacheKey = `cooldown:refresh:book:${id}`;
    const onCooldown = await this.cacheService.get(cacheKey);

    if (onCooldown) {
      throw new rrTooManyRequestsException(`${this.moduleCode}TMWRR001`, {
        message: 'This media was refreshed recently.',
      });
    }

    // Look up the existing entry to get the Google Book ID
    const existing = await this.bookRepository.find(id);
    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}BNFID001`, {
        message: 'Book not found in database',
      });
    }

    if (existing.locked) {
      throw new rrConflictException(`${this.moduleCode}LKD001`, {
        message: 'Book is locked, cannot refresh',
      });
    }

    // Fetch fresh data from Google Books
    await this.bookExternal.fetchAndUpsertBook(existing.googleBookId);

    // Bust the cache so next getBook fetches fresh data
    await this.cacheService.del(`book:${id}`);

    const cooldownSeconds = 5 * 60;
    await this.cacheService.set(cacheKey, true, cooldownSeconds);

    return await this.bookRepository.find(id);
  }

  public async ensureBook(
    googleBookId: string,
    title?: string,
    coverImage?: string,
  ): Promise<DbBookResult | null> {
    let book = (await this.bookRepository.findByGoogleBookId(
      googleBookId,
    )) as DbBookResult | null;
    if (!book) {
      try {
        await this.bookExternal.fetchAndUpsertBook(googleBookId);
        book = (await this.bookRepository.findByGoogleBookId(
          googleBookId,
        )) as DbBookResult | null;
      } catch {
        book = (await this.bookRepository.upsert(googleBookId, {
          googleBookId,
          titleString: title || 'Unknown',
          coverImage: coverImage || null,
        })) as DbBookResult;
      }
    }
    return book;
  }
}
