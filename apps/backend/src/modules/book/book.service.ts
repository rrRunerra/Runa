import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Media, SearchMedia } from '../../common/types/types';
import { BookRepository } from './repositories/book.repository';
import { BookQueueService } from './services/book-queue.service';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    private readonly bookRepository: BookRepository,
    private readonly bookQueueService: BookQueueService,
  ) {}


  public async search(name: string): Promise<SearchMedia[]> {
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(name)}&limit=20`,
      );
      if (!res.ok) {
        throw new Error(`Open Library search failed: ${res.status}`);
      }
      const data = await res.json();
      const docs = data.docs || [];

      return docs.map((item: any) => {
        const id = item.key.replace('/works/', '');
        return {
          id,
          title: {
            romaji: item.title,
            english: item.title,
          },
          coverImage: {
            large: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : '',
          },
          format: 'Book',
          status: 'Published',
          isAdult: false,
        };
      });
    } catch (error) {
      this.logger.error('Failed to search Open Library books', error);
      return [];
    }
  }

  public async getBook(id: string): Promise<Media> {
    const dbBook = await this.bookRepository.findByOpenLibraryId(id);

    if (dbBook) {
      const now = new Date();
      const updatedAt = new Date(dbBook.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS) {
        return this.bookRepository.toMedia(dbBook);
      }
    }

    try {
      const media = await this.fetchFromOpenLibrary(id);
      
      this.bookQueueService.addJob(id);

      return media;
    } catch (error) {
      if (dbBook) {
        return this.bookRepository.toMedia(dbBook);
      }
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
  }

  private async fetchFromOpenLibrary(id: string): Promise<Media> {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException('Invalid book ID format');
    }

    const res = await fetch(`https://openlibrary.org/works/${id}.json`);
    if (!res.ok) {
      throw new Error(`Open Library detail fetch failed: ${res.status}`);
    }
    const item = await res.json();

    // Get description text
    let description = '';
    if (typeof item.description === 'string') {
      description = item.description;
    } else if (item.description && typeof item.description.value === 'string') {
      description = item.description.value;
    }

    // Get cover URL
    let coverUrl = '';
    if (item.covers && item.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${item.covers[0]}-L.jpg`;
    }

    // Get authors
    const authorNames: string[] = [];
    if (item.authors && item.authors.length > 0) {
      for (const authRef of item.authors.slice(0, 2)) {
        const authKey = authRef.author?.key;
        if (authKey) {
          if (!/^\/authors\/[a-zA-Z0-9_-]+$/.test(authKey)) {
            continue;
          }
          try {
            const authorRes = await fetch(`https://openlibrary.org${authKey}.json`);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              if (authorData.name) {
                authorNames.push(authorData.name);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // Get publish year (from first publish year or search, work doesn't have it direct but we can guess or leave empty)
    let publishYear: number | null = null;
    if (item.created && typeof item.created.value === 'string') {
      const yearMatch = item.created.value.match(/\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0], 10);
      }
    }

    // Work subjects (genres)
    const subjects = item.subjects || [];

    return {
      id,
      title: {
        romaji: item.title,
        english: item.title,
        native: null,
      },
      coverImage: {
        extraLarge: coverUrl,
        large: coverUrl,
      },
      bannerImage: coverUrl,
      format: 'Book',
      status: 'Published',
      description,
      startDate: publishYear
        ? {
            year: publishYear,
            month: null,
            day: null,
          }
        : undefined,
      genres: subjects,
      studios: authorNames.map((name: string) => ({ name })),
      averageScore: null,
      popularity: null,
      chapters: null,
      volumes: null,
    };
  }
}
