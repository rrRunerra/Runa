import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGoogleBookId(googleBookId: string) {
    return this.prisma.client.aquilaBook.findUnique({
      where: { googleBookId },
    });
  }

  async upsert(
    googleBookId: string,
    data: Prisma.AquilaBookCreateInput | Prisma.AquilaBookUpdateInput,
  ) {
    return this.prisma.client.aquilaBook.upsert({
      where: { googleBookId },
      update: data,
      create: data as Prisma.AquilaBookCreateInput,
    });
  }

  toMedia(dbBook: any): Media {
    const staff: any[] = [];
    if (dbBook.authors) {
      for (const author of dbBook.authors) {
        staff.push({ id: `author-${author}`, name: author, role: 'Author' });
      }
    }
    if (dbBook.artists) {
      for (const artist of dbBook.artists) {
        staff.push({ id: `artist-${artist}`, name: artist, role: 'Visual Artist' });
      }
    }

    return {
      id: dbBook.googleBookId,
      title: {
        romaji: dbBook.titleString,
        english: dbBook.titleString,
        native: null,
      },
      coverImage: {
        extraLarge: dbBook.coverImage,
        large: dbBook.coverImage,
      },
      bannerImage: null,
      format: 'Book',
      status: 'Published',
      description: dbBook.description || '',
      startDate: dbBook.publishYear
        ? {
            year: dbBook.publishYear,
            month: null,
            day: null,
          }
        : undefined,
      genres: dbBook.subjects || [],
      studios: dbBook.authors?.map((name: string) => ({ name })) || [],
      staff,
      averageScore: dbBook.averageRating ? Math.round(dbBook.averageRating * 20) : null,
      popularity: dbBook.ratingsCount || null,
      chapters: dbBook.chapters,
      volumes: null,
      pages: dbBook.pages || null,
      subtitle: dbBook.subtitle,
      publishedDate: dbBook.publishedDate,
      averageRating: dbBook.averageRating,
      ratingsCount: dbBook.ratingsCount,
      language: dbBook.language,
      isbn10: dbBook.isbn10,
      isbn13: dbBook.isbn13,
      previewLink: dbBook.previewLink,
      infoLink: dbBook.infoLink,
      buyLink: dbBook.buyLink,
      retailPrice: dbBook.retailPrice,
      retailPriceCurrency: dbBook.retailPriceCurrency,
      maturityRating: dbBook.maturityRating,
      publisher: dbBook.publishers?.[0] || null,
      artists: dbBook.artists || [],
    };
  }
}
