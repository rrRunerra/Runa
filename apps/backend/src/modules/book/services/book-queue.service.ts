import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { BookRepository } from '../repositories/book.repository';
import { rrInternalServerErrorException } from 'src/providers/error';
import type { Media } from '../../../common/types/types';

@Injectable()
export class BookQueueService implements OnModuleInit {
  private readonly logger = new Logger(BookQueueService.name);
  private readonly moduleCode = 'BkQeSve-';
  private readonly jobQueue = new Subject<string>();
  private readonly processing = new Set<string>();

  constructor(private readonly bookRepository: BookRepository) {}

  onModuleInit(): void {
    this.processQueue();
  }

  addJob(id: string): void {
    if (!this.processing.has(id)) {
      this.jobQueue.next(id);
    }
  }

  private processQueue(): void {
    this.jobQueue
      .pipe(
        mergeMap(async (id) => {
          if (this.processing.has(id)) {
            return;
          }

          this.processing.add(id);

          try {
            this.logger.log(`Processing sync job for book ${id}`);
            await this.syncBookFromGoogleBooks(id);
            this.logger.log(`Completed sync job for book ${id}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync book ${id}: ${message}`);
          } finally {
            this.processing.delete(id);
          }
        }, 3),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncBookFromGoogleBooks(id: string): Promise<void> {
    const media = await this.fetchFromGoogleBooks(id);
    if (media) {
      await this.bookRepository.upsert(id, {
        googleBookId: id,
        titleString: media.title.english || media.title.romaji || '',
        subtitle: media.subtitle || null,
        coverImage: media.coverImage.large || '',
        description: media.description || '',
        publishYear: media.startDate?.year || null,
        publishedDate: media.publishedDate || null,
        subjects: media.genres || [],
        authors: media.studios?.map((s: any) => s.name) || [],
        artists: media.artists || [],
        publishers: media.publisher ? [media.publisher] : [],
        pages: media.pages || null,
        chapters: media.chapters || null,
        averageRating: media.averageRating || null,
        ratingsCount: media.ratingsCount || null,
        language: media.language || null,
        isbn10: media.isbn10 || null,
        isbn13: media.isbn13 || null,
        previewLink: media.previewLink || null,
        infoLink: media.infoLink || null,
        buyLink: media.buyLink || null,
        retailPrice: media.retailPrice || null,
        retailPriceCurrency: media.retailPriceCurrency || null,
        maturityRating: media.maturityRating || null,
      });
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

  private parseAuthorsAndArtists(info: any): {
    authors: string[];
    artists: string[];
  } {
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
      const artMatch = desc.match(
        /(?:illustrated|illustrations|illustrator|art|drawings|illustration)\s+(?:by|of)\s+([A-Z][a-zA-Z'.]+\s+[A-Z][a-zA-Z'.]+(?:\s+[A-Z][a-zA-Z'.]+)?)/i,
      );
      if (artMatch && artMatch[1]) {
        const artistName = artMatch[1].trim();
        if (!authors.includes(artistName) && !artists.includes(artistName)) {
          artists.push(artistName);
        }
      }
    }

    return { authors, artists };
  }

  private async fetchFromGoogleBooks(id: string): Promise<Media | null> {
    try {
      const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
      const url = `https://www.googleapis.com/books/v1/volumes/${id}${apiKey ? `?key=${apiKey}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new rrInternalServerErrorException(`${this.moduleCode}GBDFF001`, {
          message: `Google Books detail fetch failed: ${res.status}`,
        });
      }
      const item = await res.json();
      const info = item.volumeInfo || {};
      const saleInfo = item.saleInfo || {};

      const { authors, artists } = this.parseAuthorsAndArtists(info);

      let coverUrl = '';
      if (info.imageLinks) {
        coverUrl =
          info.imageLinks.extraLarge ||
          info.imageLinks.large ||
          info.imageLinks.medium ||
          info.imageLinks.thumbnail ||
          info.imageLinks.smallThumbnail ||
          '';
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
        staff.push({
          id: `artist-${artist}`,
          name: artist,
          role: 'Visual Artist',
        });
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
        averageScore: info.averageRating
          ? Math.round(info.averageRating * 20)
          : null,
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
    } catch (e) {
      this.logger.error(`Failed to fetch from Google Books in queue: ${e}`);
      return null;
    }
  }
}
