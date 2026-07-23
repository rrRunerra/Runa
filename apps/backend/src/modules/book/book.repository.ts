import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import { BookEntity, BookSearchEntity } from './book.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'BkRpstry-';
  private readonly logger = new Logger(BookRepository.name);

  public async search(name: string): Promise<BookSearchEntity[]> {
    this.logger.debug(`Searching for books: ${name} in local db`);
    try {
      const query = name.trim().split(/\s+/).join(' & ');

      const data = await this.prisma.client.aquilaBook.findMany({
        where: {
          titleString: { search: query },
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titleString || '',
        secondaryTitle: item.subtitle || null,
        coverImage: item.coverImage || null,
        format: 'BOOK',
        status: 'PUBLISHED',
        isAdult: item.maturityRating === 'MATURE',
        averageScore:
          item.averageRating != null
            ? Math.round(item.averageRating * 20)
            : null,
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch books from db',
      });
    }
  }

  public async find(id: number): Promise<BookEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    const result = await this.prisma.client.aquilaBook.findUnique({
      where: { id: numericId },
    });

    if (!result) return null;

    return {
      id: result.id,
      googleBookId: result.googleBookId,
      titleString: result.titleString,
      subtitle: result.subtitle,
      coverImage: result.coverImage,
      description: result.description,
      publishedYear: result.publishedYear,
      publishedMonth: result.publishedMonth,
      publishedDay: result.publishedDay,
      publishedDate: result.publishedDate,
      subjects: result.subjects,
      authors: result.authors,
      artists: result.artists,
      publishers: result.publishers,
      pages: result.pages,
      chapters: result.chapters,
      averageRating: result.averageRating,
      ratingsCount: result.ratingsCount,
      language: result.language,
      isbn10: result.isbn10,
      isbn13: result.isbn13,
      previewLink: result.previewLink,
      infoLink: result.infoLink,
      buyLink: result.buyLink,
      retailPrice: result.retailPrice,
      retailPriceCurrency: result.retailPriceCurrency,
      maturityRating: result.maturityRating,
      publisher: result.publisher,
      locked: result.locked,
      updatedAt: result.updatedAt,
      localPopularity: result.localPopularity ?? 0,
      localFavoritesCount: result.localFavoritesCount ?? 0,
      localAverageScore: result.localAverageScore ?? 0,
      localStatusDistribution:
        (result.localStatusDistribution as Record<string, number>) ?? {},
      localScoreDistribution:
        (result.localScoreDistribution as Record<string, number>) ?? {},
    };
  }

  public async findByGoogleBookId(
    googleBookId: string,
  ): Promise<Prisma.AquilaBookGetPayload<object> | null> {
    return this.prisma.client.aquilaBook.findUnique({
      where: { googleBookId },
    });
  }

  public async upsert(
    googleBookId: string,
    data: Prisma.AquilaBookCreateInput,
  ): Promise<Prisma.AquilaBookGetPayload<object>> {
    const existing = await this.prisma.client.aquilaBook.findUnique({
      where: { googleBookId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      return existing as Prisma.AquilaBookGetPayload<object>;
    }

    return this.prisma.client.aquilaBook.upsert({
      where: { googleBookId },
      update: data,
      create: data,
    });
  }
}
