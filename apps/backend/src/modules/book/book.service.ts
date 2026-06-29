import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Media, SearchMedia } from '../../common/types/types';
import { BookRepository } from './repositories/book.repository';
import { BookQueueService } from './services/book-queue.service';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const CACHE_DURATION_MS = isDev ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class BookService {
  private readonly logger = new Logger(BookService.name);

  constructor(
    private readonly bookRepository: BookRepository,
    private readonly bookQueueService: BookQueueService,
  ) {}

  public async search(name: string): Promise<SearchMedia[]> {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(name)}&maxResults=20${apiKey ? `&key=${apiKey}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Books search failed: ${res.status}`);
      }
      const data = await res.json();
      const items = data.items || [];

      return items.map((item: any) => {
        const id = item.id;
        const info = item.volumeInfo || {};

        let cover = '';
        if (info.imageLinks) {
          cover = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
          if (cover.startsWith('http://')) {
            cover = cover.replace('http://', 'https://');
          }
          cover = cover.replace(/zoom=[1-5]/, 'zoom=3');
        }

        return {
          id,
          title: {
            romaji: info.title || 'Unknown Title',
            english: info.title || 'Unknown Title',
          },
          coverImage: {
            large: cover,
          },
          format: 'Book',
          status: 'Published',
          isAdult: info.maturityRating === 'MATURE',
        };
      });
    } catch (error) {
      this.logger.error('Failed to search Google Books', error);
      return [];
    }
  }

  public async getBook(id: string, forceRefresh = false): Promise<Media> {
    const dbBook = await this.bookRepository.findByGoogleBookId(id);

    if (dbBook && !forceRefresh) {
      const now = new Date();
      const updatedAt = new Date(dbBook.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS) {
        return this.bookRepository.toMedia(dbBook);
      }
    }

    try {
      const media = await this.fetchFromGoogleBooks(id);
      
      this.bookQueueService.addJob(id);

      return media;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (dbBook) {
        return this.bookRepository.toMedia(dbBook);
      }
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
  }

  public async getRelatedBooks(id: string): Promise<any[]> {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=related:${id}&maxResults=10${apiKey ? `&key=${apiKey}` : ''}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch related books: ${res.status}`);
      }
      const data = await res.json();
      let items = data.items || [];

      // Fallback: If no related books are returned, try querying by subject/category of the source book
      if (items.length === 0) {
        try {
          const mainBook = await this.getBook(id);
          if (mainBook && mainBook.genres && mainBook.genres.length > 0) {
            const subject = mainBook.genres[0];
            const fallbackRes = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(subject)}&maxResults=10${apiKey ? `&key=${apiKey}` : ''}`,
            );
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              items = fallbackData.items || [];
            }
          }
        } catch (e) {
          // ignore fallback failures
        }
      }

      return items
        .filter((item: any) => item.id !== id) // filter out self
        .map((item: any) => {
          const info = item.volumeInfo || {};
          let cover = '';
          if (info.imageLinks) {
            cover = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
            if (cover.startsWith('http://')) {
              cover = cover.replace('http://', 'https://');
            }
            cover = cover.replace(/zoom=[1-5]/, 'zoom=3');
          }
          let publishYear: number | null = null;
          if (info.publishedDate) {
            const yearStr = info.publishedDate.split('-')[0];
            const parsed = parseInt(yearStr, 10);
            if (!isNaN(parsed)) publishYear = parsed;
          }
          return {
            id: item.id,
            title: {
              english: info.title,
              romaji: info.title,
            },
            coverImage: {
              large: cover,
            },
            publishYear,
          };
        });
    } catch (error) {
      this.logger.error(`Failed to get related books for ${id}`, error);
      return [];
    }
  }

  public async getBookEditions(id: string): Promise<any[]> {
    try {
      const mainBook = await this.getBook(id);
      if (!mainBook) return [];

      const title = mainBook.title.english || mainBook.title.romaji;
      const author = mainBook.studios && mainBook.studios.length > 0 ? mainBook.studios[0].name : '';

      if (!title) return [];

      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const query = `intitle:${title}${author ? `+inauthor:${author}` : ''}`;
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10${apiKey ? `&key=${apiKey}` : ''}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch book editions: ${res.status}`);
      }
      const data = await res.json();
      const items = data.items || [];

      return items
        .filter((item: any) => item.id !== id)
        .map((item: any) => {
          const info = item.volumeInfo || {};
          let cover = '';
          if (info.imageLinks) {
            cover = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
            if (cover.startsWith('http://')) {
              cover = cover.replace('http://', 'https://');
            }
            cover = cover.replace(/zoom=[1-5]/, 'zoom=3');
          }
          let publishYear: number | null = null;
          if (info.publishedDate) {
            const yearStr = info.publishedDate.split('-')[0];
            const parsed = parseInt(yearStr, 10);
            if (!isNaN(parsed)) publishYear = parsed;
          }
          return {
            id: item.id,
            title: {
              english: info.title,
              romaji: info.title,
            },
            coverImage: {
              large: cover,
            },
            publishYear,
          };
        });
    } catch (error) {
      this.logger.error(`Failed to get editions for ${id}`, error);
      return [];
    }
  }

  private cleanDescription(rawDesc: string): string {
    if (!rawDesc) return '';
    return rawDesc
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .trim();
  }

  private parseAuthorsAndArtists(info: any): { authors: string[]; artists: string[] } {
    const authors: string[] = [];
    const artists: string[] = [];
    const rawAuthors = info.authors || [];

    for (const authorName of rawAuthors) {
      const lower = authorName.toLowerCase();
      if (
        lower.includes('(art)') ||
        lower.includes('(illustrator)') ||
        lower.includes('(artist)') ||
        lower.includes('(illustration)') ||
        lower.includes('(drawings)') ||
        lower.includes('(drawing)')
      ) {
        const cleaned = authorName.replace(/\s*\([^)]+\)/g, '').trim();
        if (cleaned) artists.push(cleaned);
      } else if (
        lower.includes('(story)') ||
        lower.includes('(writer)') ||
        lower.includes('(author)') ||
        lower.includes('(original work)')
      ) {
        const cleaned = authorName.replace(/\s*\([^)]+\)/g, '').trim();
        if (cleaned) authors.push(cleaned);
      } else {
        authors.push(authorName);
      }
    }

    if (artists.length === 0 && info.description) {
      const desc = info.description;
      const artMatch = desc.match(/(?:illustrated|illustrations|illustrator|art|drawings|illustration)\s+(?:by|of)\s+([A-Z][a-zA-Z'.]+\s+[A-Z][a-zA-Z'.]+(?:\s+[A-Z][a-zA-Z'.]+)?)/i);
      if (artMatch && artMatch[1]) {
        const artistName = artMatch[1].trim();
        if (!authors.includes(artistName) && !artists.includes(artistName)) {
          artists.push(artistName);
        }
      }
    }

    return { authors, artists };
  }

  private async fetchFromGoogleBooks(id: string): Promise<Media> {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new BadRequestException('Invalid book ID format');
    }

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes/${id}${apiKey ? `?key=${apiKey}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Books detail fetch failed: ${res.status}`);
    }
    const item = await res.json();
    const info = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};

    const { authors, artists } = this.parseAuthorsAndArtists(info);

    let coverUrl = '';
    if (info.imageLinks) {
      coverUrl = info.imageLinks.extraLarge || info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || '';
      if (coverUrl.startsWith('http://')) {
        coverUrl = coverUrl.replace('http://', 'https://');
      }
      coverUrl = coverUrl.replace(/zoom=[1-5]/, 'zoom=3');
    }

    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;
    if (info.publishedDate) {
      const parts = info.publishedDate.split('-');
      if (parts[0]) {
        const parsedYear = parseInt(parts[0], 10);
        if (!isNaN(parsedYear)) year = parsedYear;
      }
      if (parts[1]) {
        const parsedMonth = parseInt(parts[1], 10);
        if (!isNaN(parsedMonth)) month = parsedMonth;
      }
      if (parts[2]) {
        const parsedDay = parseInt(parts[2], 10);
        if (!isNaN(parsedDay)) day = parsedDay;
      }
    }

    let isbn10: string | null = null;
    let isbn13: string | null = null;
    if (info.industryIdentifiers) {
      for (const ident of info.industryIdentifiers) {
        if (ident.type === 'ISBN_10') {
          isbn10 = ident.identifier;
        } else if (ident.type === 'ISBN_13') {
          isbn13 = ident.identifier;
        }
      }
    }

    const staff: any[] = [];
    for (const author of authors) {
      staff.push({ id: `author-${author}`, name: author, role: 'Author' });
    }
    for (const artist of artists) {
      staff.push({ id: `artist-${artist}`, name: artist, role: 'Visual Artist' });
    }

    return {
      id,
      title: {
        romaji: info.title || 'Unknown Title',
        english: info.title || 'Unknown Title',
        native: null,
      },
      coverImage: {
        extraLarge: coverUrl,
        large: coverUrl,
      },
      bannerImage: coverUrl,
      format: 'Book',
      status: 'Published',
      description: this.cleanDescription(info.description),
      startDate: year
        ? {
            year,
            month,
            day,
          }
        : undefined,
      genres: info.categories || [],
      studios: authors.map((name: string) => ({ name })),
      staff,
      averageScore: info.averageRating ? Math.round(info.averageRating * 20) : null,
      popularity: info.ratingsCount || null,
      chapters: null,
      volumes: null,
      pages: info.pageCount || null,
      subtitle: info.subtitle || null,
      publishedDate: info.publishedDate || null,
      averageRating: info.averageRating || null,
      ratingsCount: info.ratingsCount || null,
      language: info.language || null,
      isbn10,
      isbn13,
      previewLink: info.previewLink || null,
      infoLink: info.infoLink || null,
      buyLink: saleInfo.buyLink || null,
      retailPrice: saleInfo.retailPrice?.amount || null,
      retailPriceCurrency: saleInfo.retailPrice?.currencyCode || null,
      maturityRating: info.maturityRating || null,
      publisher: info.publisher || null,
      artists,
    };
  }
}
