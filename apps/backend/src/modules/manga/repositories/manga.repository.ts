import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class MangaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAnilistId(anilistId: number) {
    return this.prisma.client.aquilaManga.findUnique({
      where: { anilistId },
    });
  }

  async upsert(
    anilistId: number,
    data: Prisma.AquilaMangaCreateInput | Prisma.AquilaMangaUpdateInput,
  ) {
    return this.prisma.client.aquilaManga.upsert({
      where: { anilistId },
      update: data,
      create: data as Prisma.AquilaMangaCreateInput,
    });
  }

  toMedia(dbManga: any): Media {
    return {
      id: dbManga.anilistId?.toString() || dbManga.id.toString(),
      anilistId: dbManga.anilistId,
      malId: dbManga.malId,
      title: {
        romaji: dbManga.titleRomaji,
        english: dbManga.titleEnglish,
        native: dbManga.titleNative,
      },
      coverImage: {
        extraLarge: dbManga.coverImageExtraLarge,
        large: dbManga.coverImageLarge,
      },
      bannerImage: dbManga.bannerImage,
      format: dbManga.format,
      status: dbManga.status,
      description: dbManga.description || '',
      startDate: dbManga.startDateYear
        ? {
            year: dbManga.startDateYear,
            month: dbManga.startDateMonth,
            day: dbManga.startDateDay,
          }
        : undefined,
      endDate: dbManga.endDateYear
        ? {
            year: dbManga.endDateYear,
            month: dbManga.endDateMonth,
            day: dbManga.endDateDay,
          }
        : undefined,
      chapters: dbManga.chapters,
      volumes: dbManga.volumes,
      genres: dbManga.genres || [],
      source: dbManga.source,
      tags: dbManga.tags,
      relations: dbManga.relations,
      characters: dbManga.characters,
      studios: dbManga.studios?.map((name: string) => ({ name })),
      averageScore: dbManga.averageScore,
      popularity: dbManga.popularity,
      favourites: dbManga.favourites,
      trending: dbManga.trending,
      meanScore: dbManga.meanScore,
      synonyms: dbManga.synonyms || [],
      hashtag: dbManga.hashtag,
      countryOfOrigin: dbManga.countryOfOrigin,
    };
  }
}
