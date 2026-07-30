import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { BookSearchEntity } from './book.entities';
import { BookRepository } from './book.repository';
import type { GbooksVolume, GbooksSearchResponse } from './book.types';

@Injectable()
export class BookExternal {
  private readonly logger = new Logger(BookExternal.name);
  private readonly moduleCode = 'BkExt-';
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BookRepository))
    private readonly bookRepository: BookRepository,
  ) {}

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
    releaseDate: Date | null;
  } {
    if (!publishedDate) {
      return { publishedYear: null, publishedMonth: null, publishedDay: null, releaseDate: null };
    }
    const parts = publishedDate.split('-');
    const publishedYear = parts[0] ? parseInt(parts[0], 10) || null : null;
    const publishedMonth = parts[1] ? parseInt(parts[1], 10) || null : null;
    const publishedDay = parts[2] ? parseInt(parts[2], 10) || null : null;

    let releaseDate: Date | null = null;
    if (publishedYear) {
      const m = publishedMonth ? publishedMonth - 1 : 0;
      const d = publishedDay || 1;
      releaseDate = new Date(Date.UTC(publishedYear, m, d));
    }

    return { publishedYear, publishedMonth, publishedDay, releaseDate };
  }

  public async search(query: string): Promise<BookSearchEntity[]> {
    try {
      this.logger.debug(`Searching Google Books: "${query}"`);
      const data = await this.gbooksFetch<GbooksSearchResponse>(
        `${this.baseUrl}/volumes?q=${encodeURIComponent(query)}&maxResults=20`,
      );

      if (!data.items || data.items.length === 0) {
        return [];
      }

      const results: BookSearchEntity[] = [];

      for (const item of data.items) {
        const googleBookId = item.id;
        const info = item.volumeInfo || { title: '' };

        const titlePrimary = info.title || 'Untitled';
        const titleSecondary = info.subtitle || null;
        const coverImage = this.selectCoverImage(info.imageLinks);
        const { publishedYear } = this.parsePublishedDate(info.publishedDate);

        let dbRecord = await this.prisma.client.aquilaBookV2.findUnique({
          where: { googleBookId },
          select: { id: true, googleBookId: true },
        });

        if (!dbRecord) {
          try {
            dbRecord = await this.prisma.client.aquilaBookV2.create({
              data: {
                googleBookId,
                titlePrimary,
                titleSecondary,
                coverImage,
                releaseDateYear: publishedYear,
              },
              select: { id: true, googleBookId: true },
            });
          } catch {
            dbRecord = await this.prisma.client.aquilaBookV2.findUnique({
              where: { googleBookId },
              select: { id: true, googleBookId: true },
            });
          }
        }

        results.push({
          id: dbRecord ? dbRecord.id : 0,
          googleBookId,
          title: titlePrimary,
          secondaryTitle: titleSecondary,
          coverImage,
          format: 'BOOK',
          status: 'PUBLISHED',
          isAdult: info.maturityRating === 'MATURE',
          averageScore:
            info.averageRating != null
              ? Math.round(info.averageRating * 20)
              : null,
          releaseDateYear: publishedYear,
        });
      }

      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search books in Google Books: ${message}`);
      throw new rrError(`${this.moduleCode}FTFSB001`, {
        message: 'Failed to search books in Google Books',
      });
    }
  }

  public async fetchFullV2Record(googleBookId: string): Promise<any | null> {
    try {
      this.logger.debug(`Fetching full V2 book record for Google Book ID: ${googleBookId}`);
      const data = await this.gbooksFetch<GbooksVolume>(
        `${this.baseUrl}/volumes/${googleBookId}`,
      );

      if (!data || !data.volumeInfo) {
        return null;
      }

      const info = data.volumeInfo;
      const saleInfo = data.saleInfo || {};

      const coverImage = this.selectCoverImage(info.imageLinks);
      const { authors, artists } = this.parseAuthorsAndArtists(info);
      const { publishedYear, publishedMonth, publishedDay, releaseDate } =
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

      const staff: any[] = [];
      for (const author of authors) {
        staff.push({
          namePrimary: author,
          role: 'STORY',
          customRole: 'Author',
        });
      }
      for (const artist of artists) {
        staff.push({
          namePrimary: artist,
          role: 'KEY_ANIMATION',
          customRole: 'Illustrator / Artist',
        });
      }

      const publishers = info.publisher ? [info.publisher] : [];

      const averageScore = info.averageRating != null ? Math.round(info.averageRating * 20) : null;

      const sources = [
        {
          provider: 'GOOGLE_BOOKS',
          externalId: googleBookId,
          url: info.infoLink || info.previewLink || `https://books.google.com/books?id=${googleBookId}`,
          fieldsProvided: [
            'id',
            'googleBookId',
            'titlePrimary',
            'coverImage',
            'authors',
            'publishers',
            'subjects',
          ],
          fetchedAt: new Date().toISOString(),
        },
      ];

      return {
        googleBookId,
        isbn10,
        isbn13,

        titlePrimary: info.title || 'Untitled',
        titleSecondary: info.subtitle || null,
        subtitle: info.subtitle || null,

        coverImage,
        bannerImage: null,

        description,
        originalLanguage: info.language ? info.language.toUpperCase() : null,
        countryOfOrigin: null,
        format: 'BOOK',
        website: info.infoLink || null,
        siteUrl: info.infoLink || info.previewLink || `https://books.google.com/books?id=${googleBookId}`,
        previewLink: info.previewLink || null,
        infoLink: info.infoLink || null,
        buyLink: saleInfo.buyLink || null,

        releaseDateYear: publishedYear,
        releaseDateMonth: publishedMonth,
        releaseDateDay: publishedDay,
        releaseDate,

        pageCount: info.pageCount || null,

        genres: info.categories || [],
        subjects: info.categories || [],
        tags: [],
        publishers,
        authors: info.authors || [],
        status: 'PUBLISHED',
        isAdult: info.maturityRating === 'MATURE',
        synonyms: [],

        averageScore,
        googleBooksRating: info.averageRating || null,
        googleBooksRatingsCount: info.ratingsCount || null,

        sources,

        retailPrice: saleInfo.retailPrice?.amount || null,
        retailPriceCurrency: saleInfo.retailPrice?.currencyCode || null,
        ageRating: info.maturityRating || null,

        staff,
        relations: [],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch full V2 book record for ${googleBookId}: ${message}`);
      return null;
    }
  }

  public async fetchAndUpsertBook(
    googleBookId: string,
    force = false,
  ): Promise<void> {
    const fullRecord = await this.fetchFullV2Record(googleBookId);
    if (fullRecord) {
      await this.bookRepository.upsertV2Record(fullRecord);
    }
  }
}
