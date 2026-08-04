import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MediaType, RelationType, StaffRole, BookStatus } from '@runa/database';
import { BookEntity, BookSearchEntity } from './book.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class BookRepository {
  private readonly moduleCode = 'BkRpstry-';
  private readonly logger = new Logger(BookRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async search(queryStr: string): Promise<BookSearchEntity[]> {
    this.logger.debug(`Searching for books: "${queryStr}" in local AquilaBookV2`);
    try {
      const clean = queryStr.trim();
      if (!clean) return [];

      const records = await this.prisma.client.aquilaBookV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: clean, mode: 'insensitive' } },
            { titleSecondary: { contains: clean, mode: 'insensitive' } },
            { subtitle: { contains: clean, mode: 'insensitive' } },
            { authors: { has: clean } },
            { subjects: { has: clean } },
          ],
        },
        take: 30,
        orderBy: { popularity: 'desc' },
      });

      return records.map((item) => ({
        id: item.id,
        googleBookId: item.googleBookId,
        isbn10: item.isbn10,
        isbn13: item.isbn13,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || item.subtitle || null,
        coverImage: item.coverImage || null,
        format: item.format || 'BOOK',
        status: item.status,
        isAdult: item.isAdult,
        averageScore: item.averageScore,
        releaseDateYear: item.releaseDateYear,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search books from V2 db: ${err?.message || err}`);
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch books from db',
      });
    }
  }

  public async find(id: number | string): Promise<BookEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    let record: any = null;

    if (!isNaN(numericId)) {
      record = await this.prisma.client.aquilaBookV2.findUnique({
        where: { id: numericId },
      });
    }

    if (!record && typeof id === 'string') {
      record = await this.prisma.client.aquilaBookV2.findUnique({
        where: { googleBookId: id },
      });
    }

    if (!record) return null;
    const bookLocalId = record.id;

    const [rawCharacters, rawStudios, rawStaff, rawRelations] = await Promise.all([
      this.prisma.client.aquilaMediaCharacterV2.findMany({
        where: { mediaType: MediaType.BOOK, mediaId: bookLocalId },
        include: { character: true, actor: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.client.aquilaMediaStudioV2.findMany({
        where: { mediaType: MediaType.BOOK, mediaId: bookLocalId },
        include: { studio: true },
      }),
      this.prisma.client.aquilaMediaStaffV2.findMany({
        where: { mediaType: MediaType.BOOK, mediaId: bookLocalId },
        include: { staff: true },
      }),
      this.prisma.client.aquilaMediaRelationV2.findMany({
        where: { sourceType: MediaType.BOOK, sourceId: bookLocalId },
      }),
    ]);

    const relations: any[] = [];
    for (const rel of rawRelations) {
      let targetDetails: any = null;
      if (rel.targetType === MediaType.ANIME) {
        targetDetails = await this.prisma.client.aquilaAnimeV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, format: true, status: true },
        });
      } else if (rel.targetType === MediaType.MANGA) {
        targetDetails = await this.prisma.client.aquilaMangaV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, format: true, status: true },
        });
      } else if (rel.targetType === MediaType.MOVIE) {
        targetDetails = await this.prisma.client.aquilaMovieV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, status: true },
        });
      } else if (rel.targetType === MediaType.BOOK) {
        targetDetails = await this.prisma.client.aquilaBookV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, status: true },
        });
      }

      relations.push({
        id: rel.id,
        type: rel.type,
        targetType: rel.targetType,
        targetId: rel.targetId,
        titlePrimary: targetDetails?.titlePrimary || 'Unknown',
        coverImage: targetDetails?.coverImage || null,
        format: targetDetails?.format || 'BOOK',
        status: targetDetails?.status || 'PUBLISHED',
      });
    }

    return {
      id: record.id,
      googleBookId: record.googleBookId,
      isbn10: record.isbn10,
      isbn13: record.isbn13,

      titlePrimary: record.titlePrimary,
      titleSecondary: record.titleSecondary,
      subtitle: record.subtitle,
      slug: record.slug,
      tagline: record.tagline,

      coverImage: record.coverImage,
      bannerImage: record.bannerImage,
      images: record.images,

      description: record.description,
      originalLanguage: record.originalLanguage,
      countryOfOrigin: record.countryOfOrigin,
      series: record.series,
      seriesPosition: record.seriesPosition,
      format: record.format,
      website: record.website,
      siteUrl: record.siteUrl,
      previewLink: record.previewLink,
      infoLink: record.infoLink,
      buyLink: record.buyLink,

      releaseDateYear: record.releaseDateYear,
      releaseDateMonth: record.releaseDateMonth,
      releaseDateDay: record.releaseDateDay,
      releaseDate: record.releaseDate,

      pageCount: record.pageCount,
      chapterCount: record.chapterCount,
      volumeCount: record.volumeCount,

      genres: record.genres,
      subjects: record.subjects,
      tags: record.tags,
      publishers: record.publishers,
      authors: record.authors,
      status: record.status,
      isAdult: record.isAdult,
      synonyms: record.synonyms,
      locked: record.locked,

      averageScore: record.averageScore,
      googleBooksRating: record.googleBooksRating,
      googleBooksRatingsCount: record.googleBooksRatingsCount,
      favorites: record.favorites,
      popularity: record.popularity,
      totalScoreSum: record.totalScoreSum,
      scoredCount: record.scoredCount,
      statusDistribution: (record.statusDistribution as Record<string, number>) || {},
      scoreDistribution: (record.scoreDistribution as Record<string, number>) || {},

      sources: record.sources,

      retailPrice: record.retailPrice,
      retailPriceCurrency: record.retailPriceCurrency,
      ageRating: record.ageRating,
      ageRatingGuide: record.ageRatingGuide,
      contentRatings: record.contentRatings,

      googleBooksUpdatedAt: record.googleBooksUpdatedAt,

      createdAt: record.createdAt,
      updatedAt: record.updatedAt,

      characters: rawCharacters.map((c) => ({
        id: c.id,
        characterId: c.characterId,
        namePrimary: c.character.namePrimary,
        nameNative: c.character.nameNative,
        image: c.character.image || c.actor?.image || null,
        role: c.role,
        actor: c.actor
          ? {
              id: c.actor.id,
              namePrimary: c.actor.namePrimary,
              nameNative: c.actor.nameNative,
              image: c.actor.image,
            }
          : null,
      })),

      studios: rawStudios.map((s) => ({
        id: s.studio.id,
        name: s.studio.name,
        isMain: s.isMain,
      })),

      staff: rawStaff.map((st) => ({
        id: st.id,
        actor: {
          id: st.staff.id,
          namePrimary: st.staff.namePrimary,
          nameNative: st.staff.nameNative,
          image: st.staff.image,
          role: st.role,
        },
        role: st.role,
        customRole: st.customRole,
      })),

      relations,
    };
  }

  public async findByGoogleBookId(googleBookId: string): Promise<any> {
    return this.prisma.client.aquilaBookV2.findUnique({
      where: { googleBookId },
      select: {
        id: true,
        googleBookId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
        googleBooksUpdatedAt: true,
      },
    });
  }

  public async upsertV2Record(payload: any): Promise<any> {
    const { googleBookId } = payload;
    if (!googleBookId) {
      throw new rrError(`${this.moduleCode}NOGBOOKID001`, {
        message: 'Cannot upsert AquilaBookV2 without googleBookId',
      });
    }

    const existing = await this.prisma.client.aquilaBookV2.findUnique({
      where: { googleBookId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(`Book with Google Book ID ${googleBookId} is locked, skipping upsert`);
      return existing;
    }

    let statusEnum: BookStatus = BookStatus.PUBLISHED;
    if (payload.status && payload.status in BookStatus) {
      statusEnum = payload.status as BookStatus;
    }

    const dbRecord = await this.prisma.client.aquilaBookV2.upsert({
      where: { googleBookId },
      update: {
        isbn10: payload.isbn10 ?? null,
        isbn13: payload.isbn13 ?? null,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        subtitle: payload.subtitle ?? null,
        slug: payload.slug ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        series: payload.series ?? null,
        seriesPosition: payload.seriesPosition ?? null,
        format: payload.format ?? 'BOOK',
        website: payload.website ?? null,
        siteUrl: payload.siteUrl ?? null,
        previewLink: payload.previewLink ?? null,
        infoLink: payload.infoLink ?? null,
        buyLink: payload.buyLink ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,
        releaseDate: payload.releaseDate ?? null,

        pageCount: payload.pageCount ?? null,
        chapterCount: payload.chapterCount ?? null,
        volumeCount: payload.volumeCount ?? null,

        genres: payload.genres ?? [],
        subjects: payload.subjects ?? [],
        tags: payload.tags ?? [],
        publishers: payload.publishers ?? [],
        authors: payload.authors ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],

        googleBooksRating: payload.googleBooksRating ?? null,
        googleBooksRatingsCount: payload.googleBooksRatingsCount ?? null,

        sources: payload.sources ?? null,

        retailPrice: payload.retailPrice ?? null,
        retailPriceCurrency: payload.retailPriceCurrency ?? null,
        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        googleBooksUpdatedAt: Math.floor(Date.now() / 1000),
      },
      create: {
        googleBookId,
        isbn10: payload.isbn10 ?? null,
        isbn13: payload.isbn13 ?? null,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        subtitle: payload.subtitle ?? null,
        slug: payload.slug ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        series: payload.series ?? null,
        seriesPosition: payload.seriesPosition ?? null,
        format: payload.format ?? 'BOOK',
        website: payload.website ?? null,
        siteUrl: payload.siteUrl ?? null,
        previewLink: payload.previewLink ?? null,
        infoLink: payload.infoLink ?? null,
        buyLink: payload.buyLink ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,
        releaseDate: payload.releaseDate ?? null,

        pageCount: payload.pageCount ?? null,
        chapterCount: payload.chapterCount ?? null,
        volumeCount: payload.volumeCount ?? null,

        genres: payload.genres ?? [],
        subjects: payload.subjects ?? [],
        tags: payload.tags ?? [],
        publishers: payload.publishers ?? [],
        authors: payload.authors ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],

        averageScore: null,
        googleBooksRating: payload.googleBooksRating ?? null,
        googleBooksRatingsCount: payload.googleBooksRatingsCount ?? null,

        favorites: 0,
        popularity: 0,
        totalScoreSum: null,
        scoredCount: null,
        statusDistribution: {},
        scoreDistribution: {},

        sources: payload.sources ?? null,

        retailPrice: payload.retailPrice ?? null,
        retailPriceCurrency: payload.retailPriceCurrency ?? null,
        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        googleBooksUpdatedAt: Math.floor(Date.now() / 1000),
      },
    });

    const bookLocalId = dbRecord.id;

    // Save Studios (Publishers)
    if (payload.publishers && Array.isArray(payload.publishers)) {
      for (const pubName of payload.publishers) {
        if (!pubName) continue;
        let studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
          where: { name: pubName },
        });
        if (!studioObj) {
          try {
            studioObj = await this.prisma.client.aquilaStudioV2.create({
              data: { name: pubName },
            });
          } catch {
            studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
              where: { name: pubName },
            });
          }
        }
        if (studioObj) {
          const existingMediaStudio = await this.prisma.client.aquilaMediaStudioV2.findUnique({
            where: {
              mediaType_mediaId_studioId: {
                mediaType: MediaType.BOOK,
                mediaId: bookLocalId,
                studioId: studioObj.id,
              },
            },
          });
          if (!existingMediaStudio) {
            await this.prisma.client.aquilaMediaStudioV2.create({
              data: {
                mediaType: MediaType.BOOK,
                mediaId: bookLocalId,
                studioId: studioObj.id,
                isMain: true,
              },
            });
          }
        }
      }
    }

    // Save Staff (Authors & Artists & Translators)
    if (payload.staff && Array.isArray(payload.staff)) {
      for (const st of payload.staff) {
        if (!st.namePrimary) continue;
        let actorObj = await this.prisma.client.aquilaActorV2.findFirst({
          where: { namePrimary: st.namePrimary },
        });
        if (!actorObj) {
          actorObj = await this.prisma.client.aquilaActorV2.create({
            data: {
              namePrimary: st.namePrimary,
              image: st.image || null,
            },
          });
        }

        const roleEnum = st.role in StaffRole ? (st.role as StaffRole) : StaffRole.OTHER;
        const existingMediaStaff = await this.prisma.client.aquilaMediaStaffV2.findFirst({
          where: {
            mediaType: MediaType.BOOK,
            mediaId: bookLocalId,
            staffId: actorObj.id,
            role: roleEnum,
          },
        });

        if (!existingMediaStaff) {
          await this.prisma.client.aquilaMediaStaffV2.create({
            data: {
              mediaType: MediaType.BOOK,
              mediaId: bookLocalId,
              staffId: actorObj.id,
              role: roleEnum,
              customRole: st.customRole || null,
            },
          });
        }
      }
    }

    return dbRecord;
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaBookV2.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titlePrimary: true,
          genres: true,
          subjects: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titlePrimary || '';
      const firstWord = targetTitle
        .trim()
        .split(/\s+/)[0]
        ?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.subjects && target.subjects.length > 0) {
        whereConditions.push({ subjects: { hasSome: target.subjects } });
      }
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (titleKey) {
        whereConditions.push({ titlePrimary: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaBookV2.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titlePrimary: true,
          titleSecondary: true,
          coverImage: true,
          subjects: true,
          genres: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaBookV2.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titlePrimary: true,
            titleSecondary: true,
            coverImage: true,
            subjects: true,
            genres: true,
          },
          take: 12,
        });

        const existingIds = new Set(candidates.map((c) => c.id));
        for (const fb of fallback) {
          if (!existingIds.has(fb.id)) {
            candidates.push(fb);
          }
        }
      }

      const scored = candidates.map((item) => {
        let score = 0;
        const itemTitle = (item.titlePrimary || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.subjects && item.subjects) {
          const overlap = item.subjects.filter((s) => target.subjects.includes(s)).length;
          score += overlap * 3;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titlePrimary,
        coverImage: item.coverImage || null,
        type: 'BOOK',
      }));
    } catch (err) {
      this.logger.error(`Book findSimilar error: ${err}`);
      return [];
    }
  }
}
