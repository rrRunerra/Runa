import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOpenLibraryId(openLibraryId: string) {
    return this.prisma.client.aquilaBook.findUnique({
      where: { openLibraryId },
    });
  }

  async upsert(
    openLibraryId: string,
    data: Prisma.AquilaBookCreateInput | Prisma.AquilaBookUpdateInput,
  ) {
    return this.prisma.client.aquilaBook.upsert({
      where: { openLibraryId },
      update: data,
      create: data as Prisma.AquilaBookCreateInput,
    });
  }

  toMedia(dbBook: any): Media {
    return {
      id: dbBook.openLibraryId,
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
      averageScore: null,
      popularity: null,
      chapters: dbBook.chapters,
      volumes: null,
    };
  }
}
