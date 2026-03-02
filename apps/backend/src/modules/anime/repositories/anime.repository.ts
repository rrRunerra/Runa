import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class AnimeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAnilistId(anilistId: number) {
    return this.prisma.client.aquilaAnime.findUnique({
      where: { anilistId },
    });
  }

  async upsert(
    anilistId: number,
    data: Prisma.AquilaAnimeCreateInput | Prisma.AquilaAnimeUpdateInput,
  ) {
    return this.prisma.client.aquilaAnime.upsert({
      where: { anilistId },
      update: data as Prisma.AquilaAnimeUpdateInput,
      create: data as Prisma.AquilaAnimeCreateInput,
    });
  }

  toMedia(dbAnime: any): Media {
    return {
      id: dbAnime.anilistId?.toString() || dbAnime.id.toString(),
      title: {
        romaji: dbAnime.titleRomaji,
        english: dbAnime.titleEnglish,
        native: dbAnime.titleNative,
      },
      coverImage: {
        extraLarge: dbAnime.coverImageExtraLarge,
        large: dbAnime.coverImageLarge,
      },
      bannerImage: dbAnime.bannerImage,
      format: dbAnime.format,
      status: dbAnime.status,
      description: dbAnime.description || '',
      startDate: dbAnime.startDateYear
        ? {
            year: dbAnime.startDateYear,
            month: dbAnime.startDateMonth,
            day: dbAnime.startDateDay,
          }
        : undefined,
      endDate: dbAnime.endDateYear
        ? {
            year: dbAnime.endDateYear,
            month: dbAnime.endDateMonth,
            day: dbAnime.endDateDay,
          }
        : undefined,
      season: dbAnime.season,
      seasonYear: dbAnime.seasonYear,
      episodes: dbAnime.episodes,
      duration: dbAnime.duration,
      genres: dbAnime.genres || [],
      source: dbAnime.source,
      tags: dbAnime.tags,
      relations: dbAnime.relations,
      characters: dbAnime.characters,
      studios: dbAnime.studios?.map((name: string) => ({ name })),
    };
  }
}
