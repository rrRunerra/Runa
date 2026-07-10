import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { BookSearchEntity } from './book.entities';
import type { GbooksVolume, GbooksSearchResponse } from './book.types';

@Injectable()
export class BookExternal {
  private readonly logger = new Logger(BookExternal.name);
  private readonly moduleCode = 'BkExt-';
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';

  constructor(private readonly prisma: PrismaService) {}

  private gbooksFetch<T>(url: string): Promise<T> {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY ?? '';
    const separator = url.includes('?') ? '&' : '?';
    return fetch(`${url}${separator}key=${apiKey}`).then(
      (res) => res.json() as Promise<T>,
    );
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

  private parseAuthorsAndArtists(info: GbooksVolume['volumeInfo']): {
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
      if (artMatch?.[1]) {
        const artistName = artMatch[1].trim();
        if (!authors.includes(artistName) && !artists.includes(artistName)) {
          artists.push(artistName);
        }
      }
    }

    return { authors, artists };
  }

  private selectCoverImage(
    imageLinks: GbooksVolume['volumeInfo']['imageLinks'],
  ): string | null {
    if (!imageLinks) return null;
    let cover =
      imageLinks.extraLarge ||
      imageLinks.large ||
      imageLinks.medium ||
      imageLinks.thumbnail ||
      imageLinks.smallThumbnail ||
      '';
    if (cover.startsWith('http://')) {
      cover = cover.replace('http://', 'https://');
    }
    return cover.replace(/zoom=[1-5]/, 'zoom=3') || null;
  }

  private parsePublishedDate(publishedDate: string | undefined): {
    publishedYear: number | null;
    publishedMonth: number | null;
    publishedDay: number | null;
  } {
    if (!publishedDate) {
      return { publishedYear: null, publishedMonth: null, publishedDay: null };
    }
    const parts = publishedDate.split('-');
    const publishedYear = parts[0] ? parseInt(parts[0], 10) || null : null;
    const publishedMonth = parts[1] ? parseInt(parts[1], 10) || null : null;
    const publishedDay = parts[2] ? parseInt(parts[2], 10) || null : null;
    return { publishedYear, publishedMonth, publishedDay };
  }

  public async search(query: string): Promise<BookSearchEntity[]> {
    try {
      this.logger.debug('Searching for books in Google Books');
      const data = await this.gbooksFetch<GbooksSearchResponse>(
        `${this.baseUrl}/volumes?q=${encodeURIComponent(query)}&maxResults=20`,
      );

      if (!data.items || data.items.length === 0) {
        return [];
      }

      const results = await Promise.all(
        data.items.map(async (item) => {
          const googleBookId = item.id;
          const info = item.volumeInfo || { title: '' };

          const coverImage = this.selectCoverImage(info.imageLinks);
          const { publishedYear } = this.parsePublishedDate(info.publishedDate);

          const book = await this.prisma.client.aquilaBook.upsert({
            where: { googleBookId },
            update: {
              titleString: info.title || null,
              subtitle: info.subtitle || null,
              coverImage,
              authors: info.authors || [],
              publisher: info.publisher || null,
              publishedDate: info.publishedDate || null,
              publishedYear,
            },
            create: {
              googleBookId,
              titleString: info.title || null,
              subtitle: info.subtitle || null,
              coverImage,
              authors: info.authors || [],
              publisher: info.publisher || null,
              publishedDate: info.publishedDate || null,
              publishedYear,
            },
            select: {
              id: true,
              titleString: true,
              coverImage: true,
            },
          });

          this.queueFetch(googleBookId);

          return {
            id: book.id,
            title: book.titleString || info.title || '',
            secondaryTitle: info.subtitle || null,
            coverImage: book.coverImage || coverImage || null,
            format: 'BOOK',
            status: 'PUBLISHED',
            isAdult: info.maturityRating === 'MATURE',
            averageScore:
              info.averageRating != null
                ? Math.round(info.averageRating * 20)
                : null,
          } satisfies BookSearchEntity;
        }),
      );

      return results.filter((r) => r !== null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search books in Google Books: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSB001`, {
        message: 'Failed to search books in Google Books',
      });
    }
  }

  public async fetchAndUpsertBook(googleBookId: string): Promise<void> {
    try {
      const data = await this.gbooksFetch<GbooksVolume>(
        `${this.baseUrl}/volumes/${googleBookId}`,
      );

      if (!data || !data.volumeInfo) {
        throw new rrError(`${this.moduleCode}BNF001`, {
          message: `Book with Google Book ID ${googleBookId} not found`,
        });
      }

      await this.upsertBook(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch book ${googleBookId} from Google Books: ${message}`,
      );
      throw new rrError(`${this.moduleCode}FTFFB001`, {
        message: 'Failed to fetch book from Google Books',
      });
    }
  }

  private queueFetch(googleBookId: string): void {
    this.fetchAndUpsertBook(googleBookId).catch((err: Error) =>
      this.logger.warn(
        `Background fetch failed for book ${googleBookId}: ${err.message}`,
      ),
    );
  }

  private async upsertBook(volume: GbooksVolume): Promise<void> {
    const existing = await this.prisma.client.aquilaBook.findUnique({
      where: { googleBookId: volume.id },
      select: { locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Book with Google Book ID ${volume.id} is locked, skipping upsert`,
      );
      return;
    }

    const info = volume.volumeInfo || { title: '' };
    const saleInfo = volume.saleInfo || {};

    const coverImage = this.selectCoverImage(info.imageLinks);
    const { authors, artists } = this.parseAuthorsAndArtists(info);
    const { publishedYear, publishedMonth, publishedDay } =
      this.parsePublishedDate(info.publishedDate);

    const description = info.description
      ? this.cleanDescription(info.description)
      : null;

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

    await this.prisma.client.aquilaBook.upsert({
      where: { googleBookId: volume.id },
      update: {
        titleString: info.title || null,
        subtitle: info.subtitle || null,
        coverImage,
        description,
        publishedYear,
        publishedMonth,
        publishedDay,
        publishedDate: info.publishedDate || null,
        subjects: info.categories || [],
        authors,
        artists,
        publishers: info.publisher ? [info.publisher] : [],
        pages: info.pageCount || null,
        pageCount: info.pageCount || null,
        chapters: null,
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
      },
      create: {
        googleBookId: volume.id,
        titleString: info.title || null,
        subtitle: info.subtitle || null,
        coverImage,
        description,
        publishedYear,
        publishedMonth,
        publishedDay,
        publishedDate: info.publishedDate || null,
        subjects: info.categories || [],
        authors,
        artists,
        publishers: info.publisher ? [info.publisher] : [],
        pages: info.pageCount || null,
        pageCount: info.pageCount || null,
        chapters: null,
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
      },
      select: { id: true },
    });
  }
}
