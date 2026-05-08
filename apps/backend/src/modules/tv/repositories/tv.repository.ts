import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { Prisma } from '@runa/database';
import type { Media } from '../../../common/types/types';

@Injectable()
export class TvRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTvdbId(tvdbId: number) {
    return this.prisma.client.aquilaTv.findUnique({
      where: { tvdbId },
    });
  }

  async upsert(
    tvdbId: number,
    data: Prisma.AquilaTvCreateInput | Prisma.AquilaTvUpdateInput,
  ) {
    return this.prisma.client.aquilaTv.upsert({
      where: { tvdbId },
      update: data,
      create: data as Prisma.AquilaTvCreateInput,
    });
  }

  toMedia(dbTv: any): Media {
    return {
      id: dbTv.tvdbId?.toString() || dbTv.id.toString(),
      title: {
        romaji: dbTv.titleRomaji,
        english: dbTv.titleEnglish,
      },
      coverImage: {
        large: dbTv.coverImage,
      },
      bannerImage: dbTv.bannerImage,
      format: 'TV',
      status: dbTv.status || 'FINISHED',
      description: dbTv.description || '',
      genres: dbTv.genres || [],
      studios: dbTv.studios?.map((name: string) => ({ name })) || [],
      characters: dbTv.cast || [],
      seasons: dbTv.seasons || [],
      trailers: dbTv.trailers || [],
      originalCountry: dbTv.originalCountry,
      originalLanguage: dbTv.originalLanguage,
      tvType: dbTv.tvType,
      averageRuntime: dbTv.averageRuntime,
    };
  }
}
